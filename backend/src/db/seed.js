const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const companyRes = await client.query(
      `INSERT INTO companies (name)
       VALUES ('Demo F&B Group')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const companyId = companyRes.rows[0].id;

    const outlets = [
      { name: 'Downtown Cafe', code: 'DTN', address: '12 Main Street' },
      { name: 'Airport Kiosk', code: 'APT', address: 'Terminal 2' },
      { name: 'Mall Food Court', code: 'MLL', address: 'Level 3 Food Court' },
    ];

    const outletIds = {};
    for (const o of outlets) {
      const res = await client.query(
        `INSERT INTO outlets (company_id, name, code, address)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, code) DO UPDATE
           SET name = EXCLUDED.name, address = EXCLUDED.address
         RETURNING id, code`,
        [companyId, o.name, o.code, o.address]
      );
      outletIds[res.rows[0].code] = res.rows[0].id;

      await client.query(
        `INSERT INTO receipt_sequences (outlet_id, last_number)
         VALUES ($1, 0)
         ON CONFLICT (outlet_id) DO NOTHING`,
        [res.rows[0].id]
      );
    }

    const menu = [
      { name: 'Espresso', description: 'Single shot', category: 'Coffee', base_price: 3.5 },
      { name: 'Cappuccino', description: 'Espresso with steamed milk', category: 'Coffee', base_price: 4.5 },
      { name: 'Latte', description: 'Espresso with lots of milk', category: 'Coffee', base_price: 4.75 },
      { name: 'Hot Chocolate', description: 'Rich cocoa with steamed milk', category: 'Coffee', base_price: 4.25 },
      { name: 'Croissant', description: 'Butter croissant', category: 'Bakery', base_price: 3.0 },
      { name: 'Bagel & Cream Cheese', description: 'Toasted everything bagel', category: 'Bakery', base_price: 4.0 },
      { name: 'Blueberry Muffin', description: 'Fresh baked muffin', category: 'Bakery', base_price: 3.5 },
      { name: 'Chicken Sandwich', description: 'Grilled chicken sandwich', category: 'Food', base_price: 8.5 },
      { name: 'Grilled Panini', description: 'Mozzarella and tomato panini', category: 'Food', base_price: 9.0 },
      { name: 'Breakfast Burrito', description: 'Egg, cheese, salsa wrap', category: 'Food', base_price: 7.5 },
      { name: 'Caesar Salad', description: 'Classic caesar', category: 'Food', base_price: 7.25 },
      { name: 'Iced Tea', description: 'Fresh iced tea', category: 'Drinks', base_price: 3.25 },
      { name: 'Fresh Orange Juice', description: 'Pressed orange juice', category: 'Drinks', base_price: 4.5 },
      { name: 'Brownie', description: 'Chocolate brownie', category: 'Dessert', base_price: 3.75 },
    ];

    const menuIds = {};
    for (const m of menu) {
      const res = await client.query(
        `INSERT INTO menu_items (company_id, name, description, category, base_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, name) DO UPDATE
           SET description = EXCLUDED.description,
               category = EXCLUDED.category,
               base_price = EXCLUDED.base_price
         RETURNING id, name`,
        [companyId, m.name, m.description, m.category, m.base_price]
      );
      menuIds[res.rows[0].name] = res.rows[0].id;
    }

    // Assignments: Downtown gets all; Airport gets coffee/drinks; Mall gets most with price overrides
    const stockByCategory = {
      Coffee: 120,
      Bakery: 80,
      Food: 60,
      Drinks: 100,
      Dessert: 70,
    };

    const assignments = [
      { outlet: 'DTN', items: Object.keys(menuIds), overrides: {} },
      {
        outlet: 'APT',
        items: [
          'Espresso', 'Cappuccino', 'Latte', 'Hot Chocolate', 'Iced Tea',
          'Croissant', 'Bagel & Cream Cheese', 'Blueberry Muffin', 'Brownie',
        ],
        overrides: { Latte: 5.5, Cappuccino: 5.0, Espresso: 4.0 },
      },
      {
        outlet: 'MLL',
        items: [
          'Espresso', 'Cappuccino', 'Latte', 'Chicken Sandwich', 'Grilled Panini',
          'Breakfast Burrito', 'Caesar Salad', 'Iced Tea', 'Fresh Orange Juice', 'Brownie',
        ],
        overrides: { 'Chicken Sandwich': 9.5, 'Grilled Panini': 10.0 },
      },
    ];

    const menuMeta = Object.fromEntries(menu.map((m) => [m.name, m]));

    for (const a of assignments) {
      const outletId = outletIds[a.outlet];
      for (const itemName of a.items) {
        const menuItemId = menuIds[itemName];
        if (!menuItemId) continue;
        const priceOverride = a.overrides[itemName] ?? null;
        const category = menuMeta[itemName]?.category || 'Food';
        const qty = stockByCategory[category] ?? 50;

        await client.query(
          `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, price_override)
           VALUES ($1, $2, $3)
           ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
             SET price_override = EXCLUDED.price_override`,
          [outletId, menuItemId, priceOverride]
        );

        await client.query(
          `INSERT INTO inventory (outlet_id, menu_item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
             SET quantity = GREATEST(inventory.quantity, EXCLUDED.quantity),
                 updated_at = NOW()`,
          [outletId, menuItemId, qty]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully');
    console.log({ companyId, outlets: outletIds });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
