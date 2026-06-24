
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const router = express.Router();

// POST /rest/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: email and password are required' });
    }

    // Validate email domain
    if (!email.endsWith('@org.com')) {
      return res.status(400).json({ status: 'error', message: 'Invalid email domain' });
    }

    // Check duplicate email
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name || null, email, passwordHash, 'EMP']
    );

    const user = result.rows[0];

    return res.status(201).json({
      status: 'success',
      data: { userId: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// POST /rest/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: email and password are required' });
    }

    // Validate email domain
    if (!email.endsWith('@org.com')) {
      return res.status(400).json({ status: 'error', message: 'Invalid email domain' });
    }

    // Get user from db
    const userResult = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const user = userResult.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production'
    });

    // Return user data without password
    return res.status(200).json({
      status: 'success',
      data: { userId: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// POST /rest/logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  return res.status(200).json({ status: 'success', message: 'Logged out' });
});

module.exports = router;
