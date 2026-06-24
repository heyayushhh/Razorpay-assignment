
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

const router = express.Router();

// POST /rest/roles/assign
router.post('/assign', authMiddleware, requireRole('CFO'), async (req, res) => {
  try {
    const { userId, role } = req.body;
    const validRoles = ['EMP', 'RM', 'APE', 'CFO'];

    if (!userId || !role) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: userId and role are required' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    // Check user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update role
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);

    return res.status(200).json({ status: 'success', message: 'Role updated' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

module.exports = router;
