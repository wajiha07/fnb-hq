const { body, param, query } = require('express-validator');

const listOutlets = [
  query('companyId').isUUID().withMessage('companyId must be a UUID'),
];

const createOutlet = [
  body('companyId').isUUID().withMessage('companyId must be a UUID'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('code').trim().notEmpty().withMessage('code is required'),
  body('address').optional({ nullable: true }).isString(),
];

const outletIdParam = [
  param('id').isUUID().withMessage('id must be a UUID'),
];

module.exports = { listOutlets, createOutlet, outletIdParam };
