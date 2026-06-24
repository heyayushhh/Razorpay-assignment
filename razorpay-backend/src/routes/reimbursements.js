const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

const router = express.Router();

// POST /rest/reimbursements - EMP only
router.post('/', authMiddleware, requireRole('EMP'), async (req, res) => {
  try {
    const { title, description, amount } = req.body;

    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: title and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be greater than 0' });
    }

    const result = await pool.query(
      `INSERT INTO reimbursements (employee_id, title, description, amount) VALUES ($1, $2, $3, $4) RETURNING id, employee_id, title, description, amount, status, created_at, updated_at`,
      [req.user.id, title, description, amount]
    );

    return res.status(201).json({
      status: 'success',
      data: {
        reimbursementId: result.rows[0].id,
        ...result.rows[0]
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// PATCH /rest/reimbursements - RM/APE/CFO only
router.patch('/', authMiddleware, requireRole('RM', 'APE', 'CFO'), async (req, res) => {
  try {
    let { userId, reimbursementId, status, rejectionReason } = req.body;

    // Accept both userId and reimbursementId
    const reimbursementIdToUse = reimbursementId || userId;

    if (!reimbursementIdToUse || !status) {
      return res.status(400).json({ status: 'error', message: 'Validation Error: reimbursementId (or userId) and status are required' });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    // Get the current reimbursement
    const currentResult = await pool.query('SELECT * FROM reimbursements WHERE id = $1', [reimbursementIdToUse]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reimbursement not found' });
    }

    const currentReimbursement = currentResult.rows[0];
    const fromStatus = currentReimbursement.status;
    let toStatus;
    let action;

    // If already rejected or approved, don't do anything?
    if (currentReimbursement.status === 'REJECTED' || currentReimbursement.status === 'APPROVED') {
      return res.status(409).json({ status: 'error', message: 'Reimbursement already processed' });
    }

    if (status === 'REJECTED') {
      // Reject
      toStatus = 'REJECTED';
      action = 'REJECT';
      await pool.query(
        `UPDATE reimbursements SET rejected_at = NOW(), rejected_by = $1, rejection_reason = $2, status = 'REJECTED', updated_at = NOW() WHERE id = $3`,
        [req.user.id, rejectionReason || null, reimbursementIdToUse]
      );
    } else if (status === 'APPROVED') {
      // Approve
      action = 'APPROVE';
      if (req.user.role === 'CFO') {
        // CFO approves both
        toStatus = 'APPROVED';
        await pool.query(
          `UPDATE reimbursements SET rm_approved_at = NOW(), rm_approved_by = $1, ape_approved_at = NOW(), ape_approved_by = $1, status = 'APPROVED', updated_at = NOW() WHERE id = $2`,
          [req.user.id, reimbursementIdToUse]
        );
      } else if (req.user.role === 'RM') {
        // RM approves
        if (currentReimbursement.ape_approved_at) {
          // Already APE approved, so mark as approved
          toStatus = 'APPROVED';
        } else {
          // Keep as pending
          toStatus = 'PENDING';
        }
        await pool.query(
          `UPDATE reimbursements SET rm_approved_at = NOW(), rm_approved_by = $1, status = $2, updated_at = NOW() WHERE id = $3`,
          [req.user.id, toStatus, reimbursementIdToUse]
        );
      } else if (req.user.role === 'APE') {
        // APE approves
        if (!currentReimbursement.rm_approved_at) {
          return res.status(422).json({ status: 'error', message: 'RM must approve first' });
        }
        toStatus = 'APPROVED';
        await pool.query(
          `UPDATE reimbursements SET ape_approved_at = NOW(), ape_approved_by = $1, status = 'APPROVED', updated_at = NOW() WHERE id = $2`,
          [req.user.id, reimbursementIdToUse]
        );
      }
    }

    // Log to approval_audit_log
    await pool.query(
      `INSERT INTO approval_audit_log (reimbursement_id, actor_id, actor_role, action, from_status, to_status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [reimbursementIdToUse, req.user.id, req.user.role, action, fromStatus, toStatus]
    );

    // Get updated reimbursement
    const updatedResult = await pool.query('SELECT * FROM reimbursements WHERE id = $1', [reimbursementIdToUse]);

    return res.status(200).json({
      status: 'success',
      data: {
        reimbursementId: updatedResult.rows[0].id,
        ...updatedResult.rows[0]
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

module.exports = router;
