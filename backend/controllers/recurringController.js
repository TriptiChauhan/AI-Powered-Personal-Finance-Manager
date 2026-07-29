const db = require('../config/db');

// Helper to advance date based on frequency
function advanceDate(dateStr, frequency) {
  const date = new Date(dateStr);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

// Scans and automatically generates transactions for overdue recurring expenses
async function processRecurringExpenses(userId) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Fetch all active recurring expenses for the user
    const [recurrings] = await db.query(
      'SELECT * FROM recurring_expenses WHERE user_id = ? AND next_due_date <= ?',
      [userId, todayStr]
    );

    for (const item of recurrings) {
      let nextDue = item.next_due_date;
      
      // Keep generating transactions for missed dates in case server was off for multiple intervals
      while (nextDue <= todayStr) {
        const transactionDate = nextDue;

        // Log transaction
        await db.query(
          `INSERT INTO transactions (user_id, category_id, type, title, amount, date, description)
           VALUES (?, ?, 'expense', ?, ?, ?, ?)`,
          [
            userId,
            item.category_id,
            `${item.title} (Recurring)`,
            item.amount,
            transactionDate,
            item.description || `Generated automatically from recurring subscription.`
          ]
        );

        console.log(`[Recurring Ledger Engine] Logged auto transaction: "${item.title}" for date: ${transactionDate}`);

        // Shift next_due_date forward
        nextDue = advanceDate(nextDue, item.frequency);
      }

      // Update the recurring record's next due date in database
      await db.query(
        'UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?',
        [nextDue, item.id]
      );
    }
  } catch (err) {
    console.error('[Recurring Ledger Engine Error] Failed to auto-process recurring items:', err.message);
  }
}

exports.getRecurringExpenses = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Process any pending occurrences before returning data
    await processRecurringExpenses(userId);

    // 2. Fetch recurring expenses
    const [recurrings] = await db.query(
      `SELECT r.id, r.category_id, r.title, r.amount, r.frequency, DATE_FORMAT(r.next_due_date, "%Y-%m-%d") as next_due_date, r.description,
              c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM recurring_expenses r
       JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.next_due_date ASC`,
      [userId]
    );

    const formatted = recurrings.map(r => ({
      ...r,
      amount: parseFloat(r.amount)
    }));

    return res.status(200).json({ recurringExpenses: formatted });
  } catch (error) {
    console.error('Get recurring error:', error);
    return res.status(500).json({ message: 'Server error retrieving subscriptions.', error: error.message });
  }
};

exports.addRecurringExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, category_id, frequency, next_due_date, description } = req.body;

    if (!title || !amount || !category_id || !frequency || !next_due_date) {
      return res.status(400).json({ message: 'Title, amount, category_id, frequency, and next_due_date are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ message: 'Invalid frequency parameter.' });
    }

    // Verify category
    const [categoryCheck] = await db.query(
      'SELECT id FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
      [category_id, userId]
    );

    if (categoryCheck.length === 0) {
      return res.status(400).json({ message: 'Invalid category selected.' });
    }

    // Insert
    const [result] = await db.query(
      `INSERT INTO recurring_expenses (user_id, category_id, title, amount, frequency, next_due_date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, category_id, title, numericAmount, frequency, next_due_date, description || null]
    );

    // Fetch new item
    const [newItem] = await db.query(
      `SELECT r.id, r.category_id, r.title, r.amount, r.frequency, DATE_FORMAT(r.next_due_date, "%Y-%m-%d") as next_due_date, r.description,
              c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM recurring_expenses r
       JOIN categories c ON r.category_id = c.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    const formatted = {
      ...newItem[0],
      amount: parseFloat(newItem[0].amount)
    };

    // Run trigger processing in case the new start date is today
    await processRecurringExpenses(userId);

    return res.status(201).json({
      message: 'Recurring subscription logged successfully.',
      recurringExpense: formatted
    });
  } catch (error) {
    console.error('Add recurring error:', error);
    return res.status(500).json({ message: 'Server error saving recurring expense.', error: error.message });
  }
};

exports.updateRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, amount, category_id, frequency, next_due_date, description } = req.body;

    // Verify ownership
    const [check] = await db.query('SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Recurring subscription not found or unauthorized.' });
    }

    // Prepare fields
    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (amount) {
      const numericAmount = parseFloat(amount);
      if (!isNaN(numericAmount) && numericAmount > 0) {
        updates.push('amount = ?');
        params.push(numericAmount);
      }
    }
    if (category_id) {
      // Verify category
      const [categoryCheck] = await db.query(
        'SELECT id FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
        [category_id, userId]
      );
      if (categoryCheck.length > 0) {
        updates.push('category_id = ?');
        params.push(category_id);
      }
    }
    if (frequency && ['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      updates.push('frequency = ?');
      params.push(frequency);
    }
    if (next_due_date) { updates.push('next_due_date = ?'); params.push(next_due_date); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid update parameters provided.' });
    }

    params.push(id, userId);

    await db.query(
      `UPDATE recurring_expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Fetch updated item
    const [updated] = await db.query(
      `SELECT r.id, r.category_id, r.title, r.amount, r.frequency, DATE_FORMAT(r.next_due_date, "%Y-%m-%d") as next_due_date, r.description,
              c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM recurring_expenses r
       JOIN categories c ON r.category_id = c.id
       WHERE r.id = ?`,
      [id]
    );

    const formatted = {
      ...updated[0],
      amount: parseFloat(updated[0].amount)
    };

    // Run trigger
    await processRecurringExpenses(userId);

    return res.status(200).json({
      message: 'Recurring subscription updated successfully.',
      recurringExpense: formatted
    });
  } catch (error) {
    console.error('Update recurring error:', error);
    return res.status(500).json({ message: 'Server error updating recurring expense.', error: error.message });
  }
};

exports.deleteRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [check] = await db.query('SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Recurring subscription not found or unauthorized.' });
    }

    await db.query('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Recurring subscription deleted successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Delete recurring error:', error);
    return res.status(500).json({ message: 'Server error deleting recurring expense.', error: error.message });
  }
};

// Export triggers
exports.processRecurringExpenses = processRecurringExpenses;
