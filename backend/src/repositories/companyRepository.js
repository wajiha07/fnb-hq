const db = require('../config/db');

async function listCompanies() {
  const { rows } = await db.query(
    `SELECT id, name, created_at FROM companies ORDER BY name`
  );
  return rows;
}

async function getCompanyById(id) {
  const { rows } = await db.query(
    `SELECT id, name, created_at FROM companies WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { listCompanies, getCompanyById };
