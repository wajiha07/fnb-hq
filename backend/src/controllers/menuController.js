const menuService = require('../services/menuService');

async function create(req, res, next) {
  try {
    const data = await menuService.createMasterMenuItem({
      companyId: req.body.companyId,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      basePrice: req.body.basePrice,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listMaster(req, res, next) {
  try {
    const data = await menuService.getMasterMenu(req.query.companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const data = await menuService.assignMenuToOutlet({
      outletId: req.body.outletId,
      menuItemId: req.body.menuItemId,
      priceOverride: req.body.priceOverride,
      isAvailable: req.body.isAvailable,
      initialStock: req.body.initialStock,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listOutletMenu(req, res, next) {
  try {
    const data = await menuService.getOutletMenu(req.params.outletId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMaster, assign, listOutletMenu };
