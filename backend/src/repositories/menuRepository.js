const db = require('../config/db');

async function createMenuItem({ companyId, name, description, category, basePrice }) {
  const { rows } = await db.query(
    `INSERT INTO menu_items (company_id, name, description, category, base_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, company_id, name, description, category, base_price, is_active, created_at`,
    [companyId, name, description || null, category || null, basePrice]
  );
  return rows[0];
}

async function listMasterMenu(companyId) {
  const { rows } = await db.query(
    `SELECT id, company_id, name, description, category, base_price, is_active, created_at
     FROM menu_items
     WHERE company_id = $1
     ORDER BY category NULLS LAST, name`,
    [companyId]
  );
  return rows;
}

async function getMenuItemById(id) {
  const { rows } = await db.query(
    `SELECT id, company_id, name, description, category, base_price, is_active, created_at
     FROM menu_items WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function assignToOutlet({ outletId, menuItemId, priceOverride, isAvailable }, client = db) {
  const { rows } = await client.query(
    `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, price_override, is_available)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
       SET price_override = EXCLUDED.price_override,
           is_available = EXCLUDED.is_available
     RETURNING id, outlet_id, menu_item_id, price_override, is_available, created_at`,
    [outletId, menuItemId, priceOverride ?? null, isAvailable ?? true]
  );
  return rows[0];
}

async function listOutletMenu(outletId) {
  const { rows } = await db.query(
    `SELECT
       omi.id AS assignment_id,
       mi.id AS menu_item_id,
       mi.name,
       mi.description,
       mi.category,
       mi.base_price,
       omi.price_override,
       COALESCE(omi.price_override, mi.base_price) AS effective_price,
       omi.is_available,
       COALESCE(inv.quantity, 0) AS stock
     FROM outlet_menu_items omi
     JOIN menu_items mi ON mi.id = omi.menu_item_id
     LEFT JOIN inventory inv ON inv.outlet_id = omi.outlet_id AND inv.menu_item_id = omi.menu_item_id
     WHERE omi.outlet_id = $1 AND mi.is_active = TRUE
     ORDER BY mi.category NULLS LAST, mi.name`,
    [outletId]
  );
  return rows;
}

async function getOutletAssignment(outletId, menuItemId, client = db) {
  const { rows } = await client.query(
    `SELECT
       omi.id,
       omi.outlet_id,
       omi.menu_item_id,
       omi.price_override,
       omi.is_available,
       mi.base_price,
       mi.name,
       COALESCE(omi.price_override, mi.base_price) AS effective_price
     FROM outlet_menu_items omi
     JOIN menu_items mi ON mi.id = omi.menu_item_id
     WHERE omi.outlet_id = $1 AND omi.menu_item_id = $2`,
    [outletId, menuItemId]
  );
  return rows[0] || null;
}

module.exports = {
  createMenuItem,
  listMasterMenu,
  getMenuItemById,
  assignToOutlet,
  listOutletMenu,
  getOutletAssignment,
};
