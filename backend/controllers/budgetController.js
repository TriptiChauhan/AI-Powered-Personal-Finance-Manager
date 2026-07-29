const db = require('../config/db');

// Get all budgets for the current logged-in user, joining spent calculations
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get all budgets defined by user
    const [budgets] = await db.query(
      `SELECT b.id, b.category_id, b.amount_limit, b.period, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ?`,
      [userId]
    );

    // 2. Fetch current month expenditures for each category
    const [spending] = await db.query(
      `SELECT category_id, SUM(amount) as total_spent
       FROM transactions
       WHERE user_id = ? AND type = 'expense'
         AND YEAR(date) = YEAR(CURRENT_DATE())
         AND MONTH(date) = MONTH(CURRENT_DATE())
       GROUP BY category_id`,
      [userId]
    );

    // Create spending hash map for quick lookups
    const spendingMap = {};
    spending.forEach(s => {
      spendingMap[s.category_id] = parseFloat(s.total_spent);
    });

    // 3. Merge spent statistics with budget entries
    const mergedBudgets = budgets.map(b => {
      const spent = spendingMap[b.category_id] || 0;
      const limit = parseFloat(b.amount_limit);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        ...b,
        amount_limit: limit,
        amount_spent: spent,
        amount_remaining: remaining,
        percentage: parseFloat(percentage.toFixed(1))
      };
    });

    return res.status(200).json({ budgets: mergedBudgets });
  } catch (error) {
    console.error('Get budgets error:', error);
    return res.status(500).json({ message: 'Server error retrieving budget settings.', error: error.message });
  }
};

// Set or update a budget limit for a category
exports.setBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, amount_limit, period } = req.body;

    if (!category_id || !amount_limit) {
      return res.status(400).json({ message: 'category_id and amount_limit are required.' });
    }

    const limitVal = parseFloat(amount_limit);
    if (isNaN(limitVal) || limitVal <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive number.' });
    }

    // Verify category exists
    const [categoryCheck] = await db.query(
      'SELECT id FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
      [category_id, userId]
    );

    if (categoryCheck.length === 0) {
      return res.status(400).json({ message: 'Invalid category selected.' });
    }

    // Upsert budget (MySQL INSERT INTO ... ON DUPLICATE KEY UPDATE)
    await db.query(
      `INSERT INTO budgets (user_id, category_id, amount_limit, period)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount_limit = VALUES(amount_limit), period = VALUES(period)`,
      [userId, category_id, limitVal, period || 'monthly']
    );

    // Fetch the updated budget info
    const [result] = await db.query(
      `SELECT b.id, b.category_id, b.amount_limit, b.period, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.category_id = ?`,
      [userId, category_id]
    );

    // Get current spent for calculations
    const [spentCheck] = await db.query(
      `SELECT SUM(amount) as total_spent FROM transactions 
       WHERE user_id = ? AND category_id = ? AND type = 'expense'
         AND YEAR(date) = YEAR(CURRENT_DATE())
         AND MONTH(date) = MONTH(CURRENT_DATE())`,
      [userId, category_id]
    );

    const spentAmt = parseFloat(spentCheck[0].total_spent || 0);
    const updatedBudget = {
      ...result[0],
      amount_limit: parseFloat(result[0].amount_limit),
      amount_spent: spentAmt,
      amount_remaining: Math.max(0, parseFloat(result[0].amount_limit) - spentAmt),
      percentage: parseFloat(((spentAmt / parseFloat(result[0].amount_limit)) * 100).toFixed(1))
    };

    // Simulated email warning if limit is exceeded
    if (updatedBudget.amount_spent > updatedBudget.amount_limit) {
      console.log(`[Notification System] ALERT: User ID ${userId} has exceeded the budget limit for category "${result[0].category_name}". Spent: ${spentAmt}, Limit: ${result[0].amount_limit}`);
    }

    return res.status(200).json({
      message: 'Budget limit set successfully.',
      budget: updatedBudget
    });
  } catch (error) {
    console.error('Set budget error:', error);
    return res.status(500).json({ message: 'Server error setting budget limit.', error: error.message });
  }
};

// Delete budget goal
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [check] = await db.query('SELECT id FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Budget target not found or unauthorized.' });
    }

    await db.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Budget limit removed successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Delete budget error:', error);
    return res.status(500).json({ message: 'Server error deleting budget limit.', error: error.message });
  }
};
