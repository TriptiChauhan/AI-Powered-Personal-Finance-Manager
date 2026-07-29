const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/insights', authMiddleware, aiController.getInsights);

module.exports = router;
