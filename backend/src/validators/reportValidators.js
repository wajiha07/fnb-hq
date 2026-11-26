const { param, query } = require('express-validator');

const revenueByOutlet = [
  query('companyId').isUUID().withMessage('companyId must be a UUID'),
];

const topItems = [
  param('outletId').isUUID().withMessage('outletId must be a UUID'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

module.exports = { revenueByOutlet, topItems };
