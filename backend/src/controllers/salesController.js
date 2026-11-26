const salesService = require('../services/salesService');

async function create(req, res, next) {
  try {
    const data = await salesService.createSale({
      outletId: req.params.outletId,
      items: req.body.items,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
