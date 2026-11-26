const AppError = require('../utils/AppError');
const { getClient } = require('../config/db');
const outletRepository = require('../repositories/outletRepository');
const menuRepository = require('../repositories/menuRepository');
const inventoryRepository = require('../repositories/inventoryRepository');
const salesRepository = require('../repositories/salesRepository');

async function createSale({ outletId, items }) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);
  if (!outlet.is_active) throw new AppError('Outlet is inactive', 400);

  if (!items || items.length === 0) {
    throw new AppError('Sale must include at least one item', 400);
  }

  // Aggregate duplicate menu items in one request
  const aggregated = new Map();
  for (const item of items) {
    const key = item.menuItemId;
    const prev = aggregated.get(key) || 0;
    aggregated.set(key, prev + item.quantity);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const lineItems = [];
    let totalAmount = 0;

    for (const [menuItemId, quantity] of aggregated.entries()) {
      const assignment = await menuRepository.getOutletAssignment(
        outletId,
        menuItemId,
        client
      );

      if (!assignment || !assignment.is_available) {
        throw new AppError(
          `Menu item ${menuItemId} is not available at this outlet`,
          400
        );
      }

      const stock = await inventoryRepository.getStock(outletId, menuItemId, client);
      if (!stock || stock.quantity < quantity) {
        throw new AppError(
          `Insufficient stock for "${assignment.name}". Available: ${stock ? stock.quantity : 0}, requested: ${quantity}`,
          409
        );
      }

      const deducted = await inventoryRepository.deductStock(
        outletId,
        menuItemId,
        quantity,
        client
      );
      if (!deducted) {
        throw new AppError(
          `Failed to deduct stock for "${assignment.name}" (possible concurrent sale)`,
          409
        );
      }

      const unitPrice = Number(assignment.effective_price);
      const lineTotal = unitPrice * quantity;
      totalAmount += lineTotal;

      lineItems.push({
        menuItemId,
        quantity,
        unitPrice,
        lineTotal,
        name: assignment.name,
      });
    }

    const receiptNumber = await salesRepository.nextReceiptNumber(outletId, client);
    const sale = await salesRepository.createSale(
      { outletId, receiptNumber, totalAmount },
      client
    );

    for (const line of lineItems) {
      await salesRepository.createSaleItem(
        {
          saleId: sale.id,
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        },
        client
      );
    }

    await client.query('COMMIT');

    const fullSale = await salesRepository.getSaleById(sale.id, client);
    return fullSale;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createSale };
