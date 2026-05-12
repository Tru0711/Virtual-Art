const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get artist payment info
router.get('/info', auth, paymentController.getPaymentInfo);

// Update artist payment info
router.post(
  '/update',
  auth,
  [
    body('full_name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('account_number').notEmpty().trim(),
    body('ifsc').notEmpty().trim().toUpperCase(),
    body('bank_name').notEmpty().trim(),
    body('account_type').isIn(['Savings', 'Current']),
    body('pan_tax_id').optional().trim().toUpperCase(),
  ],
  validateRequest,
  paymentController.updatePaymentInfo
);

// Check if artist has completed payment info
router.get('/check-status', auth, paymentController.checkPaymentCompleteness);

module.exports = router;
