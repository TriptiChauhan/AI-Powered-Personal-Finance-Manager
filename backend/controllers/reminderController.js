const db = require('../config/db');

// Retrieve reminders for user, dynamically flagging overdue items
exports.getReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve reminders
    const [reminders] = await db.query(
      'SELECT id, title, amount, DATE_FORMAT(due_date, "%Y-%m-%d") as due_date, status, created_at FROM reminders WHERE user_id = ? ORDER BY due_date ASC',
      [userId]
    );

    const todayStr = new Date().toISOString().split('T')[0];

    // Map through and dynamically verify overdue states
    const checkedReminders = reminders.map(r => {
      let currentStatus = r.status;
      if (currentStatus === 'pending' && r.due_date < todayStr) {
        currentStatus = 'overdue';
      }
      return {
        ...r,
        amount: parseFloat(r.amount),
        status: currentStatus
      };
    });

    return res.status(200).json({ reminders: checkedReminders });
  } catch (error) {
    console.error('Get reminders error:', error);
    return res.status(500).json({ message: 'Server error retrieving reminders.', error: error.message });
  }
};

// Add reminder
exports.addReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, due_date } = req.body;

    if (!title || !amount || !due_date) {
      return res.status(400).json({ message: 'Title, amount, and due_date are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    // Insert
    const [result] = await db.query(
      'INSERT INTO reminders (user_id, title, amount, due_date, status) VALUES (?, ?, ?, ?, "pending")',
      [userId, title, numericAmount, due_date]
    );

    const newReminder = {
      id: result.insertId,
      title,
      amount: numericAmount,
      due_date,
      status: 'pending'
    };

    return res.status(201).json({
      message: 'Reminder logged successfully.',
      reminder: newReminder
    });
  } catch (error) {
    console.error('Add reminder error:', error);
    return res.status(500).json({ message: 'Server error saving reminder.', error: error.message });
  }
};

// Update reminder status or detail
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, amount, due_date, status } = req.body;

    // Verify ownership
    const [check] = await db.query('SELECT id FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
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
    if (due_date) { updates.push('due_date = ?'); params.push(due_date); }
    if (status && ['pending', 'paid', 'overdue'].includes(status)) { 
      updates.push('status = ?'); 
      params.push(status); 
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid update parameters provided.' });
    }

    params.push(id, userId);

    await db.query(
      `UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Fetch updated
    const [updated] = await db.query(
      'SELECT id, title, amount, DATE_FORMAT(due_date, "%Y-%m-%d") as due_date, status FROM reminders WHERE id = ?',
      [id]
    );

    const updatedData = {
      ...updated[0],
      amount: parseFloat(updated[0].amount)
    };

    // Simulated email warning if user paid off a reminder
    if (status === 'paid') {
      console.log(`[Notification System] Email sent: Confirming receipt of payment for bill "${updatedData.title}" of $${updatedData.amount}.`);
    }

    return res.status(200).json({
      message: 'Reminder updated successfully.',
      reminder: updatedData
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    return res.status(500).json({ message: 'Server error updating reminder.', error: error.message });
  }
};

// Delete reminder
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [check] = await db.query('SELECT id FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
    }

    await db.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Reminder deleted successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Delete reminder error:', error);
    return res.status(500).json({ message: 'Server error deleting reminder.', error: error.message });
  }
};
