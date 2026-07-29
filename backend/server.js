const express = require('express');
const cors = require('cors');
const path = require('path');

// Prevent abrupt crashes due to unhandled promise rejections or exceptions
process.on('uncaughtException', err => {
  console.error('[Uncaught Exception] Server process caught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

// Ensure environment variables are loaded relative to the file location
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import database initializer
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Mirror local sandbox development origins dynamically
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const profileRoutes = require('./routes/profileRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const budgetPlanRoutes = require('./routes/budgetPlanRoutes');
const moneyManagerRoutes = require('./routes/moneyManagerRoutes');

// Import auto-checker for recurring expenses
const recurringController = require('./controllers/recurringController');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/budget-plans', budgetPlanRoutes);
app.use('/api/money', moneyManagerRoutes);

// Root Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to the AI-Powered Expense Tracker API'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Server after database connection is verified
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server Error] Failed to initialize database and start server:', error.message);
    process.exit(1);
  }
}

startServer();
