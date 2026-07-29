const db = require('../config/db');

// Add Expense
exports.addExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const userId = req.user.id;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ message: 'Title, amount, category, and date are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    const [result] = await db.query(
      'INSERT INTO expenses (user_id, title, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, numericAmount, category, date, description || null]
    );

    const newExpense = {
      id: result.insertId,
      user_id: userId,
      title,
      amount: numericAmount,
      category,
      date,
      description: description || null
    };

    return res.status(201).json({
      message: 'Expense added successfully.',
      expense: newExpense
    });
  } catch (error) {
    console.error('Add expense error:', error);
    return res.status(500).json({ message: 'Server error adding expense.', error: error.message });
  }
};

// Get Expenses
exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve all expenses for the user, sorting by date descending
    const [expenses] = await db.query(
      'SELECT id, title, amount, category, DATE_FORMAT(date, "%Y-%m-%d") as date, description FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC',
      [userId]
    );

    return res.status(200).json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ message: 'Server error retrieving expenses.', error: error.message });
  }
};

// Update Expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date, description } = req.body;
    const userId = req.user.id;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ message: 'Title, amount, category, and date are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    // Verify expense ownership and update it
    const [check] = await db.query('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized.' });
    }

    await db.query(
      'UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?, description = ? WHERE id = ? AND user_id = ?',
      [title, numericAmount, category, date, description || null, id, userId]
    );

    const updatedExpense = {
      id: parseInt(id),
      user_id: userId,
      title,
      amount: numericAmount,
      category,
      date,
      description: description || null
    };

    return res.status(200).json({
      message: 'Expense updated successfully.',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return res.status(500).json({ message: 'Server error updating expense.', error: error.message });
  }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [check] = await db.query('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized.' });
    }

    await db.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Expense deleted successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ message: 'Server error deleting expense.', error: error.message });
  }
};
