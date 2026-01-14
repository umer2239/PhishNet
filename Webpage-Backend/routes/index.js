const express = require('express');
const router = express.Router();

// Import routes
router.use('/users', require('./users'));
router.use('/auth', require('./auth'));
router.use('/scan', require('./scan'));
router.use('/analytics', require('./analytics'));

module.exports = router;
