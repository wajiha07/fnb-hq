const express = require('express');
const salesController = require('../controllers/salesController');
const validate = require('../middleware/validate');
const salesValidators = require('../validators/salesValidators');

const router = express.Router({ mergeParams: true });

router.post('/', salesValidators.createSale, validate, salesController.create);

module.exports = router;
