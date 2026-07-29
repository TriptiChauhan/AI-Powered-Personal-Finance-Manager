const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', recurringController.getRecurringExpenses);
router.post('/', recurringController.addRecurringExpense);
router.put('/:id', recurringController.updateRecurringExpense);
router.delete('/:id', recurringController.deleteRecurringExpense);

module.exports = router;
