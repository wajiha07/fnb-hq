const outletService = require('../services/outletService');

async function list(req, res, next) {
  try {
    const data = await outletService.listOutlets(req.query.companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await outletService.createOutlet({
      companyId: req.body.companyId,
      name: req.body.name,
      code: req.body.code,
      address: req.body.address,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await outletService.getOutlet(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById };
