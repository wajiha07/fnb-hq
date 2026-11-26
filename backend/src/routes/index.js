const express = require('express');
const companyRoutes = require('./companyRoutes');
const outletRoutes = require('./outletRoutes');
const menuRoutes = require('./menuRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const salesRoutes = require('./salesRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

router.use('/companies', companyRoutes);
router.use('/outlets', outletRoutes);
router.use('/menu', menuRoutes);
router.use('/outlets/:outletId/inventory', inventoryRoutes);
router.use('/outlets/:outletId/sales', salesRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
