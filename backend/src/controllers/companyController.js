const companyService = require('../services/companyService');

async function list(req, res, next) {
  try {
    const data = await companyService.listCompanies();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
