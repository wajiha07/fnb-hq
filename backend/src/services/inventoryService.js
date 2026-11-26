const AppError = require('../utils/AppError');
const outletRepository = require('../repositories/outletRepository');
const menuRepository = require('../repositories/menuRepository');
const inventoryRepository = require('../repositories/inventoryRepository');

async function listInventory(outletId) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);
  return inventoryRepository.listByOutlet(outletId);
}

async function setStock({ outletId, menuItemId, quantity }) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);

  const assignment = await menuRepository.getOutletAssignment(outletId, menuItemId);
  if (!assignment) {
    throw new AppError('Menu item is not assigned to this outlet', 400);
  }

  if (quantity < 0) {
    throw new AppError('Quantity cannot be negative', 400);
  }

  return inventoryRepository.upsertStock({ outletId, menuItemId, quantity });
}

module.exports = { listInventory, setStock };
