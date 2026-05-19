const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const OtpVerification = require('../models/OtpVerification');
const { sendEmail } = require('../utils/sendEmail');
const { generateOtp, hashOtp, normalizeEmail } = require('../utils/otp');

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 3);
const RESET_SESSION_EXPIRES_MINUTES = Number(process.env.RESET_SESSION_EXPIRES_MINUTES || 10);

const getEmailErrorResponse = (error) => {
  if (error?.code === 'EMAIL_TIMEOUT') {
    return {
      status: 504,
      message: 'Email delivery timed out. Please try again in a moment.',
    };
  }

  return {
    status: error?.statusCode || 503,
    message: error?.publicMessage || 'Email service is temporarily unavailable. Please try again.',
  };
};

const rollbackOtpRecord = async (email, purpose) => {
  try {
    await OtpVerification.deleteOne({ email, purpose });
  } catch (error) {
    console.warn('[otp] failed to rollback OTP record after email failure', {
      email,
      purpose,
      error: error.message,
    });
  }
};

const signAuthToken = (user) => {
  return jwt.sign(
    { userId: user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '30d' }
  );
};

const signResetSessionToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: `${RESET_SESSION_EXPIRES_MINUTES}m`,
  });
};

const validateStrongPassword = (password = '') => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one symbol';
  return null;
};

const sendOtpEmail = async ({ email, otp, purpose, name }) => {
  const title =
    purpose === 'signup'
      ? 'Verify your VisualArt account'
      : purpose === 'forgot_password'
      ? 'VisualArt password reset OTP'
      : 'VisualArt login verification OTP';

  const safeName = name || 'there';
  const text = `Hi ${safeName}, your VisualArt OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="margin: 0 0 16px; color: #111827;">${title}</h2>
      <p style="margin: 0 0 16px;">Hi ${safeName},</p>
      <p style="margin: 0 0 20px;">Use the OTP below to continue:</p>
      <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-align: center;">
        ${otp}
      </div>
      <p style="margin: 20px 0 0;">This OTP expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
      <p style="margin: 8px 0 0; color: #6b7280;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: title,
    text,
    html,
  });
};

const upsertOtpRecord = async ({ email, purpose, otp, metadata = {} }) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const cooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_SECONDS * 1000);

  const otpRecord = await OtpVerification.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        otpHash: hashOtp(otp),
        expiresAt,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        cooldownUntil,
        lastSentAt: now,
        isVerified: false,
        verifiedAt: null,
        metadata,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    otpRecord,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
  };
};

const sendOtp = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      user_type,
      phone,
      address,
      artist_name,
      bio,
      portfolio_link,
      purpose,
    } = req.body;

    const flowPurpose = purpose || 'signup';
    if (flowPurpose !== 'signup') {
      return res.status(400).json({ message: 'Unsupported OTP purpose for this endpoint' });
    }

    if (!email || !password || !full_name || !user_type) {
      return res.status(400).json({ message: 'Missing required signup fields' });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedUserType = user_type === 'buyer' ? 'user' : user_type;

    if (!['user', 'artist'].includes(normalizedUserType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const existingOtp = await OtpVerification.findOne({ email: normalizedEmail, purpose: flowPurpose });
    if (existingOtp && existingOtp.cooldownUntil > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((existingOtp.cooldownUntil.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        message: `Please wait ${waitSeconds}s before requesting another OTP`,
        cooldownSeconds: waitSeconds,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();

    const metadata = {
      full_name,
      user_type: normalizedUserType,
      phone: phone || undefined,
      address: address || undefined,
      artist_name: artist_name || undefined,
      bio: bio || undefined,
      portfolio_link: portfolio_link || undefined,
      hashedPassword,
    };

    const { expiresInSeconds, cooldownSeconds } = await upsertOtpRecord({
      email: normalizedEmail,
      purpose: flowPurpose,
      otp,
      metadata,
    });

    try {
      await sendOtpEmail({
        email: normalizedEmail,
        otp,
        purpose: flowPurpose,
        name: full_name,
      });
    } catch (error) {
      await rollbackOtpRecord(normalizedEmail, flowPurpose);
      const emailError = getEmailErrorResponse(error);
      console.error('Send signup OTP email failed:', {
        email: normalizedEmail,
        purpose: flowPurpose,
        code: error?.code,
        statusCode: emailError.status,
        message: error?.message,
      });
      return res.status(emailError.status).json({ message: emailError.message });
    }

    return res.json({
      success: true,
      message: 'OTP sent to your email',
      email: normalizedEmail,
      purpose: flowPurpose,
      expiresInSeconds,
      cooldownSeconds,
    });
  } catch (error) {
    console.error('Send signup OTP error:', error);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

const forgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    // Always return a generic success message to avoid account enumeration.
    if (!user) {
      return res.json({
        success: true,
        message: 'If this email exists, an OTP has been sent.',
        email: normalizedEmail,
      });
    }

    const existingOtp = await OtpVerification.findOne({ email: normalizedEmail, purpose: 'forgot_password' });
    if (existingOtp && existingOtp.cooldownUntil > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((existingOtp.cooldownUntil.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        message: `Please wait ${waitSeconds}s before requesting another OTP`,
        cooldownSeconds: waitSeconds,
      });
    }

    const otp = generateOtp();
    const { expiresInSeconds, cooldownSeconds } = await upsertOtpRecord({
      email: normalizedEmail,
      purpose: 'forgot_password',
      otp,
      metadata: {
        userId: user._id.toString(),
        full_name: user.full_name,
      },
    });

    try {
      await sendOtpEmail({
        email: normalizedEmail,
        otp,
        purpose: 'forgot_password',
        name: user.full_name,
      });
    } catch (error) {
      await rollbackOtpRecord(normalizedEmail, 'forgot_password');
      const emailError = getEmailErrorResponse(error);
      console.error('Forgot password OTP email failed:', {
        email: normalizedEmail,
        code: error?.code,
        statusCode: emailError.status,
        message: error?.message,
      });
      return res.status(emailError.status).json({ message: emailError.message });
    }

    return res.json({
      success: true,
      message: 'OTP sent to your email',
      email: normalizedEmail,
      purpose: 'forgot_password',
      expiresInSeconds,
      cooldownSeconds,
    });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ message: 'Email and purpose are required' });
    }

    if (!['signup', 'forgot_password', 'login'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingOtp = await OtpVerification.findOne({ email: normalizedEmail, purpose });

    if (!existingOtp) {
      return res.status(400).json({ message: 'No OTP request found. Please start again.' });
    }

    if (existingOtp.cooldownUntil > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((existingOtp.cooldownUntil.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        message: `Please wait ${waitSeconds}s before requesting another OTP`,
        cooldownSeconds: waitSeconds,
      });
    }

    if (purpose === 'forgot_password') {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ message: 'Unable to resend OTP. Please restart flow.' });
      }
    }

    const otp = generateOtp();
    const metadata = existingOtp.metadata || {};

    const { expiresInSeconds, cooldownSeconds } = await upsertOtpRecord({
      email: normalizedEmail,
      purpose,
      otp,
      metadata,
    });

    try {
      await sendOtpEmail({
        email: normalizedEmail,
        otp,
        purpose,
        name: metadata.full_name,
      });
    } catch (error) {
      await rollbackOtpRecord(normalizedEmail, purpose);
      const emailError = getEmailErrorResponse(error);
      console.error('Resend OTP email failed:', {
        email: normalizedEmail,
        purpose,
        code: error?.code,
        statusCode: emailError.status,
        message: error?.message,
      });
      return res.status(emailError.status).json({ message: emailError.message });
    }

    return res.json({
      success: true,
      message: 'OTP resent successfully',
      email: normalizedEmail,
      purpose,
      expiresInSeconds,
      cooldownSeconds,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, purpose, otp } = req.body;
    if (!email || !purpose || !otp) {
      return res.status(400).json({ message: 'Email, purpose, and OTP are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const otpRecord = await OtpVerification.findOne({ email: normalizedEmail, purpose });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP request not found or expired' });
    }

    if (otpRecord.expiresAt <= new Date()) {
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(429).json({
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
      });
    }

    const isOtpValid = hashOtp(otp) === otpRecord.otpHash;
    if (!isOtpValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const attemptsLeft = Math.max(0, otpRecord.maxAttempts - otpRecord.attempts);
      return res.status(400).json({
        message: attemptsLeft > 0 ? 'Invalid OTP' : 'Maximum OTP attempts exceeded. Please request a new OTP.',
        attemptsLeft,
      });
    }

    if (purpose === 'signup') {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        await OtpVerification.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ message: 'User already exists' });
      }

      const metadata = otpRecord.metadata || {};
      const user = new User({
        email: normalizedEmail,
        password: metadata.hashedPassword,
        full_name: metadata.full_name,
        user_type: metadata.user_type,
        phone: metadata.phone,
        address: metadata.address,
      });

      await user.save();

      if (metadata.user_type === 'artist' && metadata.artist_name && metadata.bio) {
        const artistProfile = new ArtistProfile({
          user_id: user._id,
          artist_name: metadata.artist_name,
          bio: metadata.bio,
          portfolio_link: metadata.portfolio_link,
        });
        await artistProfile.save();
      }

      await OtpVerification.deleteOne({ _id: otpRecord._id });

      const token = signAuthToken(user);
      return res.json({
        success: true,
        flow: 'signup',
        message: 'OTP verified. Account created successfully.',
        token,
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
        },
      });
    }

    if (purpose === 'forgot_password') {
      otpRecord.isVerified = true;
      otpRecord.verifiedAt = new Date();
      otpRecord.attempts = 0;
      await otpRecord.save();

      const resetToken = signResetSessionToken({
        email: normalizedEmail,
        purpose: 'forgot_password',
        otpRecordId: otpRecord._id.toString(),
      });

      return res.json({
        success: true,
        flow: 'forgot_password',
        message: 'OTP verified successfully',
        email: normalizedEmail,
        resetToken,
        resetTokenExpiresInSeconds: RESET_SESSION_EXPIRES_MINUTES * 60,
      });
    }

    if (purpose === 'login') {
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      return res.json({ success: true, flow: 'login', message: 'OTP verified successfully' });
    }

    return res.status(400).json({ message: 'Unsupported OTP purpose' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, password, confirmPassword } = req.body;

    if (!email || !resetToken || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Email, reset token, and password fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    let tokenPayload;
    try {
      tokenPayload = jwt.verify(resetToken, process.env.JWT_SECRET || 'fallback_secret');
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please verify OTP again.' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (
      tokenPayload.purpose !== 'forgot_password' ||
      tokenPayload.email !== normalizedEmail ||
      !tokenPayload.otpRecordId
    ) {
      return res.status(400).json({ message: 'Invalid reset session. Please verify OTP again.' });
    }

    const otpRecord = await OtpVerification.findOne({
      _id: tokenPayload.otpRecordId,
      email: normalizedEmail,
      purpose: 'forgot_password',
      isVerified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Reset session has expired. Please request a new OTP.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Unable to reset password. Please retry the flow.' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.updated_at = new Date();
    await user.save();

    await OtpVerification.deleteMany({ email: normalizedEmail, purpose: 'forgot_password' });

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      role: user.user_type,
    });
  } catch (error) {
    console.error('OTP reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  forgotPasswordOtp,
  resetPassword,
};
