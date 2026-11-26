const express = require('express');
const menuController = require('../controllers/menuController');
const validate = require('../middleware/validate');
const menuValidators = require('../validators/menuValidators');

const router = express.Router();

router.post('/', menuValidators.createMenuItem, validate, menuController.create);
router.get('/', menuValidators.listMasterMenu, validate, menuController.listMaster);
router.post('/assign', menuValidators.assignMenu, validate, menuController.assign);
router.get(
  '/outlet/:outletId',
  menuValidators.outletIdParam,
  validate,
  menuController.listOutletMenu
);

module.exports = router;
