const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables relative to this file location
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fintech_token_key_123456';

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');

  console.log('[Auth Middleware] Verifying request authorization header...');

  if (!authHeader) {
    console.warn('[Auth Middleware Warning] No authorization header provided in request.');
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided. Access denied.'
    });
  }

  // Expecting format: Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.warn('[Auth Middleware Warning] Token format is invalid (must be Bearer <token>).');
    return res.status(401).json({
      success: false,
      message: 'Token format is invalid. Use Bearer <token>.'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[Auth Middleware] JWT token verified successfully. Decoded User ID: ${decoded.id}, Username: "${decoded.username}"`);
    req.user = decoded; // Bind decoded payload (id, username, email)
    next();
  } catch (err) {
    console.warn('[Auth Middleware Warning] Token verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired. Access denied.',
      error: err.message
    });
  }
};
