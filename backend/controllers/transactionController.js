const db = require('../config/db');
const recurringController = require('./recurringController');

// Add Transaction
exports.addTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Process recurring items first so any auto-billing is updated
    await recurringController.processRecurringExpenses(userId);

    const { title, amount, type, category_id, date, description } = req.body;

    if (!title || !amount || !type || !category_id || !date) {
      return res.status(400).json({ message: 'Title, amount, type, category_id, and date are required.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be "income" or "expense".' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    // Verify category exists and matches type
    const [categories] = await db.query(
      'SELECT id, type FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
      [category_id, userId]
    );

    if (categories.length === 0) {
      return res.status(400).json({ message: 'Selected category is invalid.' });
    }

    if (categories[0].type !== type) {
      return res.status(400).json({ message: `Category type mismatch. The selected category is for "${categories[0].type}" transactions.` });
    }

    // Insert
    const [result] = await db.query(
      'INSERT INTO transactions (user_id, category_id, type, title, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, category_id, type, title, numericAmount, date, description || null]
    );

    // Fetch newly created transaction with category info
    const [newTransaction] = await db.query(
      `SELECT t.id, t.title, t.amount, t.type, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.description,
              c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Transaction recorded successfully.',
      transaction: newTransaction[0]
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    return res.status(500).json({ message: 'Server error adding transaction.', error: error.message });
  }
};

// Get Transactions (with advanced Search, Filter, Pagination, Sorting)
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Process recurring items first
    await recurringController.processRecurringExpenses(userId);
    
    // Parse Query Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { search, category_id, type, startDate, endDate, sortBy } = req.query;

    // Build SQL query dynamically
    let countSql = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?';
    let dataSql = `
      SELECT t.id, t.title, t.amount, t.type, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.description,
             c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;

    const queryParams = [userId];

    // Filters
    if (search && search.trim() !== '') {
      const searchPattern = `%${search}%`;
      countSql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      dataSql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      queryParams.push(searchPattern, searchPattern);
    }

    if (category_id) {
      countSql += ' AND t.category_id = ?';
      dataSql += ' AND t.category_id = ?';
      queryParams.push(category_id);
    }

    if (type && (type === 'income' || type === 'expense')) {
      countSql += ' AND t.type = ?';
      dataSql += ' AND t.type = ?';
      queryParams.push(type);
    }

    if (startDate) {
      countSql += ' AND t.date >= ?';
      dataSql += ' AND t.date >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      countSql += ' AND t.date <= ?';
      dataSql += ' AND t.date <= ?';
      queryParams.push(endDate);
    }

    // Sort order
    let orderClause = ' ORDER BY t.date DESC, t.id DESC'; // default
    if (sortBy) {
      switch (sortBy) {
        case 'date_asc':
          orderClause = ' ORDER BY t.date ASC, t.id ASC';
          break;
        case 'amount_desc':
          orderClause = ' ORDER BY t.amount DESC, t.id DESC';
          break;
        case 'amount_asc':
          orderClause = ' ORDER BY t.amount ASC, t.id DESC';
          break;
        case 'date_desc':
        default:
          orderClause = ' ORDER BY t.date DESC, t.id DESC';
          break;
      }
    }

    dataSql += orderClause;

    // Run Count Query first
    const [countResult] = await db.query(countSql, queryParams);
    const totalTransactions = countResult[0].total;
    const totalPages = Math.ceil(totalTransactions / limit);

    // Append Pagination parameters to data query
    dataSql += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Run Data Query
    const [transactions] = await db.query(dataSql, queryParams);

    return res.status(200).json({
      transactions,
      pagination: {
        total: totalTransactions,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ message: 'Server error retrieving transactions.', error: error.message });
  }
};

// Update Transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, type, category_id, date, description } = req.body;
    const userId = req.user.id;

    if (!title || !amount || !type || !category_id || !date) {
      return res.status(400).json({ message: 'Title, amount, type, category_id, and date are required.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be "income" or "expense".' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    // Verify transaction owner
    const [transactionCheck] = await db.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (transactionCheck.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized.' });
    }

    // Verify category exists and matches type
    const [categoryCheck] = await db.query(
      'SELECT id, type FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
      [category_id, userId]
    );

    if (categoryCheck.length === 0) {
      return res.status(400).json({ message: 'Selected category is invalid.' });
    }

    if (categoryCheck[0].type !== type) {
      return res.status(400).json({ message: `Category type mismatch. The selected category is for "${categoryCheck[0].type}" transactions.` });
    }

    // Update
    await db.query(
      'UPDATE transactions SET category_id = ?, type = ?, title = ?, amount = ?, date = ?, description = ? WHERE id = ? AND user_id = ?',
      [category_id, type, title, numericAmount, date, description || null, id, userId]
    );

    // Fetch updated transaction details
    const [updatedTransaction] = await db.query(
      `SELECT t.id, t.title, t.amount, t.type, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.description,
              c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    return res.status(200).json({
      message: 'Transaction updated successfully.',
      transaction: updatedTransaction[0]
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    return res.status(500).json({ message: 'Server error updating transaction.', error: error.message });
  }
};

// Delete Transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [transactionCheck] = await db.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (transactionCheck.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized.' });
    }

    // Delete
    await db.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Transaction deleted successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ message: 'Server error deleting transaction.', error: error.message });
  }
};
