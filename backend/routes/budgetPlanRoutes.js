const express = require('express');
const router = express.Router();
const budgetPlanController = require('../controllers/budgetPlanController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all routes

router.post('/', budgetPlanController.createPlan);
router.get('/', budgetPlanController.getPlans);
router.get('/:id', budgetPlanController.getPlanDetails);
router.delete('/:id', budgetPlanController.deletePlan);
router.get('/compare/:id1/:id2', budgetPlanController.comparePlans);

module.exports = router;
