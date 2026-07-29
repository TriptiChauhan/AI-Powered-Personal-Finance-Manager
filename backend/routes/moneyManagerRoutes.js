const express = require('express');
const router = express.Router();
const moneyManagerController = require('../controllers/moneyManagerController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all routes

// Categories CRUD
router.get('/categories', moneyManagerController.getCategories);
router.post('/categories', moneyManagerController.addCategory);
router.delete('/categories/:id', moneyManagerController.deleteCategory);

// Payment Methods CRUD
router.get('/payment-methods', moneyManagerController.getPaymentMethods);
router.post('/payment-methods', moneyManagerController.addPaymentMethod);
router.delete('/payment-methods/:id', moneyManagerController.deletePaymentMethod);

// Transactions CRUD
router.post('/income', moneyManagerController.addIncome);
router.post('/expense', moneyManagerController.addExpense);
router.get('/transactions', moneyManagerController.getTransactions);
router.put('/transaction/:id', moneyManagerController.updateTransaction);
router.delete('/transaction/:id', moneyManagerController.deleteTransaction);

// Dashboard & AI
router.get('/dashboard', moneyManagerController.getDashboardStats);
router.post('/ai/analyze', moneyManagerController.generateAIReport);
router.post('/ai/chat', moneyManagerController.askAdvisor);

module.exports = router;
