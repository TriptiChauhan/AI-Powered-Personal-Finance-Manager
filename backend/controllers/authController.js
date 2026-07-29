const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const path = require('path');

// Load environment variables relative to this file location
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fintech_token_key_123456';

// Helper to generate JWT
const generateToken = (user) => {
  console.log(`[Auth JWT] Generating token payload for User ID: ${user.id}, Username: "${user.username}"`);
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  console.log('[Auth JWT] Token generated successfully.');
  return token;
};

// Register User
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('[Auth Register] Incoming registration request:');
    console.log(`  Username: "${username}"`);
    console.log(`  Email: "${email}"`);
    console.log(`  Password Length: ${password ? password.length : 0}`);

    // Validation
    if (!username || !email || !password) {
      console.warn('[Auth Register Failed] 400 Bad Request: Missing required credentials fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.'
      });
    }

    if (password.length < 6) {
      console.warn('[Auth Register Failed] 400 Bad Request: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate user
    console.log(`[Auth Register DB] Querying database: SELECT id FROM users WHERE username = ? OR email = ?`);
    const [existingUsers] = await db.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const match = existingUsers[0];
      const detail = match.email === email ? 'Email already registered' : 'Username already taken';
      console.warn(`[Auth Register Failed] 409 Conflict: ${detail} ("${email}" / "${username}")`);
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists.'
      });
    }

    // Hash password
    console.log('[Auth Register Bcrypt] Generating salt and hashing user password...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log('[Auth Register Bcrypt] Password hash completed successfully.');

    // Insert user
    console.log(`[Auth Register DB] Querying: INSERT INTO users (username, email, password_hash) VALUES ("${username}", "${email}", ...)`);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const newUser = {
      id: result.insertId,
      username,
      email
    };
    console.log(`[Auth Register DB] User inserted successfully. Assigned ID: ${result.insertId}`);

    // Generate JWT
    const token = generateToken(newUser);

    console.log('[Auth Register Success] User registration sequence completed successfully. Returning 201.');
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: newUser
    });

  } catch (error) {
    console.error('[Auth Register Error] Fatal Exception during registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message
    });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('[Auth Login] Incoming user sign-in request:');
    console.log(`  Identifier (Email/Username): "${identifier}"`);
    console.log(`  Password Length: ${password ? password.length : 0}`);

    if (!identifier || !password) {
      console.warn('[Auth Login Failed] 400 Bad Request: Missing login credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password.'
      });
    }

    // Find User
    console.log(`[Auth Login DB] Querying: SELECT * FROM users WHERE email = ? OR username = ?`);
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      console.warn(`[Auth Login Failed] 401 Unauthorized: No matching user found for "${identifier}"`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const user = users[0];
    console.log(`[Auth Login DB] Found matching user record. User ID: ${user.id}, Username: "${user.username}"`);

    // Verify Password
    console.log('[Auth Login Bcrypt] Comparing password hash matches...');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`[Auth Login Bcrypt] Password verification completed. Match result: ${isMatch}`);

    if (!isMatch) {
      console.warn(`[Auth Login Failed] 401 Unauthorized: Password mismatch for user ID: ${user.id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    // Generate JWT
    const token = generateToken(userData);

    console.log(`[Auth Login Success] User authenticated successfully. ID: ${user.id}. Returning 200.`);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: userData
    });

  } catch (error) {
    console.error('[Auth Login Error] Fatal Exception during login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message
    });
  }
};

// Retrieve User Profile (Protected)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[Auth Profile] Incoming request for user profile. User ID: ${userId}`);

    console.log(`[Auth Profile DB] Querying user profile: SELECT id, username, email, currency, email_notifications FROM users WHERE id = ${userId}`);
    const [users] = await db.query(
      'SELECT id, username, email, currency, email_notifications, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.warn(`[Auth Profile Failed] 404 Not Found: No profile matches for user ID ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    console.log(`[Auth Profile Success] Profile retrieved for user: "${users[0].username}". Returning 200.`);
    return res.status(200).json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('[Auth Profile Error] Exception retrieving profile details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile.',
      error: error.message
    });
  }
};
