const inventoryService = require('../services/inventoryService');

async function list(req, res, next) {
  try {
    const data = await inventoryService.listInventory(req.params.outletId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function setStock(req, res, next) {
  try {
    const data = await inventoryService.setStock({
      outletId: req.params.outletId,
      menuItemId: req.body.menuItemId,
      quantity: req.body.quantity,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, setStock };
