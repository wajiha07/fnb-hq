const db = require('../config/db');

async function revenueByOutlet(companyId) {
  const { rows } = await db.query(
    `SELECT
       o.id AS outlet_id,
       o.name AS outlet_name,
       o.code AS outlet_code,
       COALESCE(SUM(s.total_amount), 0) AS total_revenue,
       COUNT(s.id)::int AS sale_count
     FROM outlets o
     LEFT JOIN sales s ON s.outlet_id = o.id
     WHERE o.company_id = $1
     GROUP BY o.id, o.name, o.code
     ORDER BY total_revenue DESC`,
    [companyId]
  );
  return rows;
}

async function topSellingItems(outletId, limit = 5) {
  const { rows } = await db.query(
    `SELECT
       mi.id AS menu_item_id,
       mi.name AS menu_item_name,
       SUM(si.quantity)::int AS quantity_sold,
       SUM(si.line_total) AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN menu_items mi ON mi.id = si.menu_item_id
     WHERE s.outlet_id = $1
     GROUP BY mi.id, mi.name
     ORDER BY quantity_sold DESC, revenue DESC
     LIMIT $2`,
    [outletId, limit]
  );
  return rows;
}

module.exports = { revenueByOutlet, topSellingItems };
