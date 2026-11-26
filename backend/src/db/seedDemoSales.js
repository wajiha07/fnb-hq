const { pool } = require('../config/db');

async function nextReceipt(outletId, client) {
  const { rows } = await client.query(
    `INSERT INTO receipt_sequences (outlet_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (outlet_id) DO UPDATE
       SET last_number = receipt_sequences.last_number + 1
     RETURNING last_number`,
    [outletId]
  );
  return `R-${String(rows[0].last_number).padStart(8, '0')}`;
}

async function effectivePrice(client, outletId, menuItemId) {
  const { rows } = await client.query(
    `SELECT COALESCE(omi.price_override, mi.base_price) AS price
     FROM outlet_menu_items omi
     JOIN menu_items mi ON mi.id = omi.menu_item_id
     WHERE omi.outlet_id = $1 AND omi.menu_item_id = $2`,
    [outletId, menuItemId]
  );
  return rows[0] ? Number(rows[0].price) : null;
}

async function recordSale(client, outletId, lines) {
  let total = 0;
  const priced = [];

  for (const { menuItemId, quantity } of lines) {
    const unitPrice = await effectivePrice(client, outletId, menuItemId);
    if (unitPrice == null) return null;
    const lineTotal = unitPrice * quantity;
    total += lineTotal;
    priced.push({ menuItemId, quantity, unitPrice, lineTotal });
  }

  for (const line of priced) {
    await client.query(
      `INSERT INTO inventory (outlet_id, menu_item_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
         SET quantity = GREATEST(inventory.quantity, EXCLUDED.quantity), updated_at = NOW()`,
      [outletId, line.menuItemId, line.quantity + 50]
    );

    const { rowCount } = await client.query(
      `UPDATE inventory
       SET quantity = quantity - $3, updated_at = NOW()
       WHERE outlet_id = $1 AND menu_item_id = $2 AND quantity >= $3`,
      [outletId, line.menuItemId, line.quantity]
    );
    if (!rowCount) throw new Error(`Insufficient stock for item ${line.menuItemId}`);
  }

  const receiptNumber = await nextReceipt(outletId, client);
  const { rows: saleRows } = await client.query(
    `INSERT INTO sales (outlet_id, receipt_number, total_amount)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [outletId, receiptNumber, total]
  );
  const saleId = saleRows[0].id;

  for (const line of priced) {
    await client.query(
      `INSERT INTO sale_items (sale_id, menu_item_id, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5)`,
      [saleId, line.menuItemId, line.quantity, line.unitPrice, line.lineTotal]
    );
  }

  return { saleId, receiptNumber, total };
}

async function seedDemoSales() {
  const client = await pool.connect();
  try {
    const companyRes = await client.query(
      `SELECT id FROM companies WHERE name = 'Demo F&B Group' LIMIT 1`
    );
    if (!companyRes.rows[0]) {
      console.error('Run npm run seed first (Demo F&B Group not found).');
      process.exitCode = 1;
      return;
    }
    const companyId = companyRes.rows[0].id;

    const outletsRes = await client.query(
      `SELECT id, code FROM outlets WHERE company_id = $1 ORDER BY code`,
      [companyId]
    );
    const byCode = Object.fromEntries(outletsRes.rows.map((o) => [o.code, o.id]));

    const menuRes = await client.query(
      `SELECT id, name FROM menu_items WHERE company_id = $1`,
      [companyId]
    );
    const byName = Object.fromEntries(menuRes.rows.map((m) => [m.name, m.id]));

    const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM sales`);
    const force = process.env.SEED_DEMO_FORCE === '1';
    if (!force && countRes.rows[0].n >= 25) {
      console.log(
        `Sales already present (${countRes.rows[0].n}). Skipping demo batch (set SEED_DEMO_FORCE=1 to add more).`
      );
      return;
    }

    await client.query('BEGIN');

    const batches = [
      { outlet: 'DTN', lines: [
        [{ name: 'Espresso', qty: 2 }, { name: 'Croissant', qty: 2 }],
        [{ name: 'Cappuccino', qty: 1 }, { name: 'Latte', qty: 1 }],
        [{ name: 'Chicken Sandwich', qty: 1 }, { name: 'Iced Tea', qty: 2 }],
        [{ name: 'Espresso', qty: 3 }],
        [{ name: 'Latte', qty: 2 }, { name: 'Brownie', qty: 1 }],
        [{ name: 'Caesar Salad', qty: 1 }, { name: 'Cappuccino', qty: 1 }],
        [{ name: 'Hot Chocolate', qty: 2 }, { name: 'Blueberry Muffin', qty: 2 }],
        [{ name: 'Breakfast Burrito', qty: 1 }, { name: 'Fresh Orange Juice', qty: 2 }],
      ]},
      { outlet: 'APT', lines: [
        [{ name: 'Espresso', qty: 1 }, { name: 'Croissant', qty: 1 }],
        [{ name: 'Latte', qty: 2 }],
        [{ name: 'Cappuccino', qty: 2 }, { name: 'Brownie', qty: 1 }],
        [{ name: 'Iced Tea', qty: 3 }],
        [{ name: 'Espresso', qty: 2 }, { name: 'Bagel & Cream Cheese', qty: 1 }],
        [{ name: 'Hot Chocolate', qty: 1 }],
      ]},
      { outlet: 'MLL', lines: [
        [{ name: 'Chicken Sandwich', qty: 2 }, { name: 'Iced Tea', qty: 2 }],
        [{ name: 'Caesar Salad', qty: 1 }, { name: 'Latte', qty: 1 }],
        [{ name: 'Breakfast Burrito', qty: 2 }],
        [{ name: 'Grilled Panini', qty: 1 }, { name: 'Fresh Orange Juice', qty: 2 }],
        [{ name: 'Brownie', qty: 3 }, { name: 'Cappuccino', qty: 1 }],
        [{ name: 'Chicken Sandwich', qty: 1 }, { name: 'Caesar Salad', qty: 1 }],
      ]},
    ];

    let created = 0;
    for (const batch of batches) {
      const outletId = byCode[batch.outlet];
      if (!outletId) continue;

      for (const cart of batch.lines) {
        const lines = cart
          .map((row) => {
            const menuItemId = byName[row.name];
            if (!menuItemId) return null;
            return { menuItemId, quantity: row.qty };
          })
          .filter(Boolean);

        if (lines.length === 0) continue;
        await recordSale(client, outletId, lines);
        created += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Demo sales seeded: ${created} transactions across outlets.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Demo sales seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoSales();