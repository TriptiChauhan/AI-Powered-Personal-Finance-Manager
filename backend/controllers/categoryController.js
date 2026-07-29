const db = require('../config/db');

// Get all categories for a user (global + custom)
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Select global categories (user_id IS NULL) and user-specific custom ones
    const [categories] = await db.query(
      'SELECT id, name, type, color, icon, user_id FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type DESC, name ASC',
      [userId]
    );

    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ message: 'Server error retrieving categories.', error: error.message });
  }
};

// Create a custom category
exports.createCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const userId = req.user.id;

    if (!name || !type || !color || !icon) {
      return res.status(400).json({ message: 'Name, type, color, and icon are required.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type must be "income" or "expense".' });
    }

    // Check if category already exists globally or for this user
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE name = ? AND type = ? AND (user_id IS NULL OR user_id = ?)',
      [name, type, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: `A category named "${name}" already exists for type "${type}".` });
    }

    // Insert custom category
    const [result] = await db.query(
      'INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
      [userId, name, type, color, icon]
    );

    const newCategory = {
      id: result.insertId,
      user_id: userId,
      name,
      type,
      color,
      icon
    };

    return res.status(201).json({
      message: 'Custom category created successfully.',
      category: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ message: 'Server error creating category.', error: error.message });
  }
};
