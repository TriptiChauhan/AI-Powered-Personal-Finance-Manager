const db = require('../config/db');

// Get current user profile details
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, username, email, currency, email_notifications, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error retrieving profile details.', error: error.message });
  }
};

// Update user settings
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, currency, email_notifications } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required.' });
    }

    // Verify username or email is not taken by another user
    const [existing] = await db.query(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username or email is already in use.' });
    }

    // Perform update
    const notificationsBool = email_notifications === true || email_notifications === 'true' || email_notifications === 1 ? 1 : 0;
    const selectCurrency = currency || 'USD';

    await db.query(
      'UPDATE users SET username = ?, email = ?, currency = ?, email_notifications = ? WHERE id = ?',
      [username, email, selectCurrency, notificationsBool, userId]
    );

    // Fetch updated profile
    const [updated] = await db.query(
      'SELECT id, username, email, currency, email_notifications, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Mock Email notification logging to console (as required by specification)
    if (notificationsBool === 1) {
      console.log(`[Notification Email System] Dispatched security warning to: "${email}". Profile settings successfully updated.`);
    }

    return res.status(200).json({
      message: 'Profile settings updated successfully.',
      user: updated[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error updating profile settings.', error: error.message });
  }
};
