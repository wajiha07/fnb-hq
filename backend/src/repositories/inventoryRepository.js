const db = require('../config/db');

async function upsertStock({ outletId, menuItemId, quantity }, client = db) {
  const { rows } = await client.query(
    `INSERT INTO inventory (outlet_id, menu_item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
       SET quantity = EXCLUDED.quantity, updated_at = NOW()
     RETURNING id, outlet_id, menu_item_id, quantity, updated_at`,
    [outletId, menuItemId, quantity]
  );
  return rows[0];
}

async function listByOutlet(outletId) {
  const { rows } = await db.query(
    `SELECT
       inv.id,
       inv.outlet_id,
       inv.menu_item_id,
       mi.name AS menu_item_name,
       inv.quantity,
       inv.updated_at
     FROM inventory inv
     JOIN menu_items mi ON mi.id = inv.menu_item_id
     WHERE inv.outlet_id = $1
     ORDER BY mi.name`,
    [outletId]
  );
  return rows;
}

async function getStock(outletId, menuItemId, client = db) {
  const { rows } = await client.query(
    `SELECT id, outlet_id, menu_item_id, quantity, updated_at
     FROM inventory
     WHERE outlet_id = $1 AND menu_item_id = $2
     FOR UPDATE`,
    [outletId, menuItemId]
  );
  return rows[0] || null;
}

async function deductStock(outletId, menuItemId, qty, client) {
  const { rows } = await client.query(
    `UPDATE inventory
     SET quantity = quantity - $3, updated_at = NOW()
     WHERE outlet_id = $1 AND menu_item_id = $2 AND quantity >= $3
     RETURNING id, outlet_id, menu_item_id, quantity, updated_at`,
    [outletId, menuItemId, qty]
  );
  return rows[0] || null;
}

async function ensureInventoryRow(outletId, menuItemId, client = db) {
  await client.query(
    `INSERT INTO inventory (outlet_id, menu_item_id, quantity)
     VALUES ($1, $2, 0)
     ON CONFLICT (outlet_id, menu_item_id) DO NOTHING`,
    [outletId, menuItemId]
  );
}

module.exports = {
  upsertStock,
  listByOutlet,
  getStock,
  deductStock,
  ensureInventoryRow,
};
