const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all AI Planner routes

router.get('/prefill', plannerController.getPrefillData);
router.post('/generate', plannerController.generateFinancialPlan);
router.post('/ask', plannerController.askAI);

module.exports = router;
