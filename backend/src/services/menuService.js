const AppError = require('../utils/AppError');
const companyRepository = require('../repositories/companyRepository');
const outletRepository = require('../repositories/outletRepository');
const menuRepository = require('../repositories/menuRepository');
const inventoryRepository = require('../repositories/inventoryRepository');
const { getClient } = require('../config/db');

async function createMasterMenuItem(payload) {
  const company = await companyRepository.getCompanyById(payload.companyId);
  if (!company) throw new AppError('Company not found', 404);

  try {
    return await menuRepository.createMenuItem(payload);
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Menu item with this name already exists', 409);
    }
    throw err;
  }
}

async function getMasterMenu(companyId) {
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) throw new AppError('Company not found', 404);
  return menuRepository.listMasterMenu(companyId);
}

async function assignMenuToOutlet({ outletId, menuItemId, priceOverride, isAvailable, initialStock }) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);

  const menuItem = await menuRepository.getMenuItemById(menuItemId);
  if (!menuItem) throw new AppError('Menu item not found', 404);

  if (menuItem.company_id !== outlet.company_id) {
    throw new AppError('Menu item does not belong to the same company as the outlet', 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const assignment = await menuRepository.assignToOutlet(
      { outletId, menuItemId, priceOverride, isAvailable },
      client
    );

    if (initialStock !== undefined && initialStock !== null) {
      await inventoryRepository.upsertStock(
        { outletId, menuItemId, quantity: initialStock },
        client
      );
    } else {
      await inventoryRepository.ensureInventoryRow(outletId, menuItemId, client);
    }

    await client.query('COMMIT');
    return assignment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOutletMenu(outletId) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);
  return menuRepository.listOutletMenu(outletId);
}

module.exports = {
  createMasterMenuItem,
  getMasterMenu,
  assignMenuToOutlet,
  getOutletMenu,
};
