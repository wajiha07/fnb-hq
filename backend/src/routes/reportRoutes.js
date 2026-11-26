const express = require('express');
const reportController = require('../controllers/reportController');
const validate = require('../middleware/validate');
const reportValidators = require('../validators/reportValidators');

const router = express.Router();

router.get(
  '/revenue',
  reportValidators.revenueByOutlet,
  validate,
  reportController.revenueByOutlet
);
router.get(
  '/outlets/:outletId/top-items',
  reportValidators.topItems,
  validate,
  reportController.topItems
);

module.exports = router;
