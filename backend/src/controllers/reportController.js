const reportService = require('../services/reportService');

async function revenueByOutlet(req, res, next) {
  try {
    const data = await reportService.getRevenueByOutlet(req.query.companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function topItems(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const data = await reportService.getTopSellingItems(req.params.outletId, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { revenueByOutlet, topItems };
