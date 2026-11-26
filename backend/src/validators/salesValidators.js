const { body, param } = require('express-validator');

const createSale = [
  param('outletId').isUUID().withMessage('outletId must be a UUID'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.menuItemId').isUUID().withMessage('each item needs a valid menuItemId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('each item quantity must be >= 1'),
];

module.exports = { createSale };
