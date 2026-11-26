async function nextReceiptNumber(outletId, client) {
  const { rows } = await client.query(
    `INSERT INTO receipt_sequences (outlet_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (outlet_id) DO UPDATE
       SET last_number = receipt_sequences.last_number + 1
     RETURNING last_number`,
    [outletId]
  );
  const n = rows[0].last_number;
  return `R-${String(n).padStart(8, '0')}`;
}

async function createSale({ outletId, receiptNumber, totalAmount }, client) {
  const { rows } = await client.query(
    `INSERT INTO sales (outlet_id, receipt_number, total_amount)
     VALUES ($1, $2, $3)
     RETURNING id, outlet_id, receipt_number, total_amount, created_at`,
    [outletId, receiptNumber, totalAmount]
  );
  return rows[0];
}

async function createSaleItem(
  { saleId, menuItemId, quantity, unitPrice, lineTotal },
  client
) {
  const { rows } = await client.query(
    `INSERT INTO sale_items (sale_id, menu_item_id, quantity, unit_price, line_total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, sale_id, menu_item_id, quantity, unit_price, line_total`,
    [saleId, menuItemId, quantity, unitPrice, lineTotal]
  );
  return rows[0];
}

async function getSaleById(saleId, client) {
  const saleRes = await client.query(
    `SELECT id, outlet_id, receipt_number, total_amount, created_at
     FROM sales WHERE id = $1`,
    [saleId]
  );
  if (!saleRes.rows[0]) return null;

  const itemsRes = await client.query(
    `SELECT
       si.id,
       si.menu_item_id,
       mi.name AS menu_item_name,
       si.quantity,
       si.unit_price,
       si.line_total
     FROM sale_items si
     JOIN menu_items mi ON mi.id = si.menu_item_id
     WHERE si.sale_id = $1
     ORDER BY mi.name`,
    [saleId]
  );

  return { ...saleRes.rows[0], items: itemsRes.rows };
}

module.exports = {
  nextReceiptNumber,
  createSale,
  createSaleItem,
  getSaleById,
};
