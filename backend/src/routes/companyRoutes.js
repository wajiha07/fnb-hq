const express = require('express');
const companyController = require('../controllers/companyController');

const router = express.Router();

router.get('/', companyController.list);

module.exports = router;
