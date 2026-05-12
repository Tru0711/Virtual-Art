const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const otpController = require('../controllers/otpController');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty(),
    body('user_type').isIn(['artist', 'user', 'admin'])
  ],
  validateRequest,
  authController.register
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').exists()],
  validateRequest,
  authController.login
);

router.post(
  '/send-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').notEmpty(),
    body('user_type').isIn(['artist', 'user', 'buyer'])
  ],
  validateRequest,
  otpController.sendOtp
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('purpose').isIn(['signup', 'forgot_password', 'login']),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric()
  ],
  validateRequest,
  otpController.verifyOtp
);

router.post(
  '/resend-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('purpose').isIn(['signup', 'forgot_password', 'login'])
  ],
  validateRequest,
  otpController.resendOtp
);

router.post(
  '/forgot-password-otp',
  rateLimiter,
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  otpController.forgotPasswordOtp
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('resetToken').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('confirmPassword').isLength({ min: 8 })
  ],
  validateRequest,
  otpController.resetPassword
);

router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getCurrentUser);
router.get('/profile', auth, authController.getProfile);

router.post('/forgot-password', rateLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Update password
router.post('/update-password', auth, authController.updatePassword);

// Update email
router.post('/update-email', auth, authController.updateEmail);

module.exports = router;
