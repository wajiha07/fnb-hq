const db = require('../config/db');

async function listByCompany(companyId) {
  const { rows } = await db.query(
    `SELECT id, company_id, name, code, address, is_active, created_at
     FROM outlets
     WHERE company_id = $1
     ORDER BY name`,
    [companyId]
  );
  return rows;
}

async function getById(id) {
  const { rows } = await db.query(
    `SELECT id, company_id, name, code, address, is_active, created_at
     FROM outlets WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ companyId, name, code, address }) {
  const { rows } = await db.query(
    `INSERT INTO outlets (company_id, name, code, address)
     VALUES ($1, $2, $3, $4)
     RETURNING id, company_id, name, code, address, is_active, created_at`,
    [companyId, name, code, address || null]
  );

  await db.query(
    `INSERT INTO receipt_sequences (outlet_id, last_number) VALUES ($1, 0)`,
    [rows[0].id]
  );

  return rows[0];
}

module.exports = { listByCompany, getById, create };
