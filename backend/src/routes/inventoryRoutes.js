const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const validate = require('../middleware/validate');
const inventoryValidators = require('../validators/inventoryValidators');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  inventoryValidators.outletIdParam,
  validate,
  inventoryController.list
);
router.put(
  '/',
  inventoryValidators.setStock,
  validate,
  inventoryController.setStock
);

module.exports = router;
