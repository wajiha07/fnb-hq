const { body, param } = require('express-validator');

const outletIdParam = [
  param('outletId').isUUID().withMessage('outletId must be a UUID'),
];

const setStock = [
  param('outletId').isUUID().withMessage('outletId must be a UUID'),
  body('menuItemId').isUUID().withMessage('menuItemId must be a UUID'),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be >= 0'),
];

module.exports = { outletIdParam, setStock };
