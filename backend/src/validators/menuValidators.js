const { body, param, query } = require('express-validator');

const createMenuItem = [
  body('companyId').isUUID().withMessage('companyId must be a UUID'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('description').optional({ nullable: true }).isString(),
  body('category').optional({ nullable: true }).isString(),
  body('basePrice').isFloat({ min: 0 }).withMessage('basePrice must be >= 0'),
];

const listMasterMenu = [
  query('companyId').isUUID().withMessage('companyId must be a UUID'),
];

const assignMenu = [
  body('outletId').isUUID().withMessage('outletId must be a UUID'),
  body('menuItemId').isUUID().withMessage('menuItemId must be a UUID'),
  body('priceOverride')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('priceOverride must be >= 0'),
  body('isAvailable').optional().isBoolean(),
  body('initialStock')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('initialStock must be >= 0'),
];

const outletIdParam = [
  param('outletId').isUUID().withMessage('outletId must be a UUID'),
];

module.exports = { createMenuItem, listMasterMenu, assignMenu, outletIdParam };
