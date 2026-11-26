const express = require('express');
const outletController = require('../controllers/outletController');
const validate = require('../middleware/validate');
const outletValidators = require('../validators/outletValidators');

const router = express.Router();

router.get('/', outletValidators.listOutlets, validate, outletController.list);
router.post('/', outletValidators.createOutlet, validate, outletController.create);
router.get('/:id', outletValidators.outletIdParam, validate, outletController.getById);

module.exports = router;
