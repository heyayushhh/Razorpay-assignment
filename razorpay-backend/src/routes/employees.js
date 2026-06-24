
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

const router = express.Router();

// GET /rest/employees
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query;
    const params = [];

    if (req.user.role === 'EMP') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    } else if (req.user.role === 'RM') {
      query = `
        SELECT id AS "userId", name, email, role 
        FROM users 
        WHERE id IN (SELECT employee_id FROM reporting_assignments WHERE rm_id = $1) 
        AND role = 'EMP'
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'APE') {
      query = `
        SELECT id AS "userId", name, email, role 
        FROM users 
        WHERE role IN ('EMP', 'RM')
      `;
    } else if (req.user.role === 'CFO') {
      query = `
        SELECT id AS "userId", name, email, role 
        FROM users
      `;
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      status: 'success',
      data: { users: result.rows }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// POST /rest/employees/assign
router.post('/assign', authMiddleware, requireRole('CFO'), async (req, res) => {
  try {
    const { userId: empId, rmId } = req.body;

    if (!empId || !rmId) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: userId(emp) and rmId are required' });
    }

    // Check emp exists and is EMP
    const empResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [empId]);
    if (empResult.rows.length === 0 || empResult.rows[0].role !== 'EMP') {
      return res.status(400).json({ status: 'error', message: 'Invalid employee user' });
    }

    // Check rm exists and is RM
    const rmResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [rmId]);
    if (rmResult.rows.length === 0 || rmResult.rows[0].role !== 'RM') {
      return res.status(400).json({ status: 'error', message: 'Invalid RM user' });
    }

    // Check if assignment already exists
    const existingResult = await pool.query(
      'SELECT id FROM reporting_assignments WHERE employee_id = $1 AND rm_id = $2',
      [empId, rmId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Assignment already exists' });
    }

    // Insert into reporting_assignments
    await pool.query(
      'INSERT INTO reporting_assignments (employee_id, rm_id) VALUES ($1, $2)',
      [empId, rmId]
    );

    return res.status(201).json({ status: 'success', message: 'Assignment created' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// DELETE /rest/employees/assign
router.delete('/assign', authMiddleware, requireRole('CFO'), async (req, res) => {
  try {
    const { userId: empId, rmId } = req.body;

    if (!empId || !rmId) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: userId(emp) and rmId are required' });
    }

    await pool.query(
      'DELETE FROM reporting_assignments WHERE employee_id = $1 AND rm_id = $2',
      [empId, rmId]
    );

    return res.status(200).json({ status: 'success', message: 'Assignment deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

module.exports = router;
