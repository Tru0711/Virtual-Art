const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const { sendEmail } = require('../utils/sendEmail');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRE_MINUTES = 15;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getEmailErrorResponse = (error) => {
  if (error?.code === 'EMAIL_TIMEOUT') {
    return {
      status: 504,
      message: 'Password reset email timed out. Please try again.',
    };
  }

  return {
    status: error?.statusCode || 503,
    message: error?.publicMessage || 'Email service is temporarily unavailable. Please try again.',
  };
};

const isStrongPassword = (password = '') => {
  if (password.length < 8) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
};

const signToken = (user) => {
  return jwt.sign(
    { userId: user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '30d' }
  );
};

const register = async (req, res) => {
  try {
    const { email, password, full_name, user_type, phone, profile_picture, address, artist_name, bio, portfolio_link } = req.body;

    const existingUser = await User.findOne({ email: normalizeEmail(email) });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: normalizeEmail(email),
      password: hashedPassword,
      full_name,
      user_type,
      phone,
      profile_picture,
      address
    });

    await user.save();

    if (user_type === 'artist' && artist_name && bio) {
      const artistProfile = new ArtistProfile({
        user_id: user._id,
        artist_name,
        bio,
        portfolio_link
      });
      await artistProfile.save();
    }

    const token = signToken(user);

    res.status(201).json({ token, user: { id: user._id, email: user.email, full_name, user_type } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      ...user.toObject()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      ...user.toObject()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    console.log('=== FORGOT PASSWORD REQUEST ===');
    const { email } = req.body;
    console.log('Received email from request body:', email);

    if (!email) {
      console.log('Error: Email is required but not provided');
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    console.log('Normalized email:', normalizedEmail);
    
    // Search for user in User collection
    const user = await User.findOne({ email: normalizedEmail });
    console.log('User found in database:', user ? 'YES' : 'NO');
    
    if (user) {
      console.log('User ID:', user._id);
      console.log('User type:', user.user_type);
      console.log('User name:', user.full_name);
      
      // Generate secure random token (32 bytes = 64 hex characters)
      const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
      console.log('Generated raw token (first 10 chars):', rawToken.substring(0, 10));
      
      // Hash the token before storing in database
      const hashedToken = hashToken(rawToken);
      console.log('Hashed token (first 10 chars):', hashedToken.substring(0, 10));

      // Set token and expiry
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = new Date(Date.now() + RESET_EXPIRE_MINUTES * 60 * 1000);
      await user.save();
      console.log('Token saved to database with expiry:', user.resetPasswordExpire);

      // Build reset URL with raw token (not hashed)
      const baseUrl = process.env.FRONTEND_URL || 'https://virtual-art-psi.vercel.app';
      const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;
      console.log('Reset URL created:', resetUrl);

      // Email content
      const subject = 'Reset your VisualArt password';
      const text = `You requested a password reset. Click the link to reset: ${resetUrl}\n\nThis link expires in ${RESET_EXPIRE_MINUTES} minutes.`;
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #2563eb; margin: 0; }
              .content { margin: 20px 0; }
              .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
              .warning { background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎨 VisualArt Password Reset</h1>
              </div>
              <div class="content">
                <p>Hi ${user.full_name},</p>
                <p>You requested to reset your password for your VisualArt account.</p>
                <p>Click the button below to reset your password:</p>
                <center>
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </center>
                <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f4f4f4; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0;">
                    <li>This link will expire in <strong>${RESET_EXPIRE_MINUTES} minutes</strong></li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated email from VisualArt. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} VisualArt. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      console.log('Attempting to send email to:', user.email);
      try {
        await sendEmail({
          to: user.email,
          subject,
          text,
          html,
        });
        console.log('✅ Email sent successfully to:', user.email);
      } catch (mailError) {
        console.error('❌ Failed to send email:', mailError.message);
        console.error('Email error stack:', mailError.stack);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        const emailError = getEmailErrorResponse(mailError);
        return res.status(emailError.status).json({
          success: false,
          message: emailError.message,
        });
      }
    } else {
      console.log('No user found with email:', normalizedEmail);
      // Still return success to prevent email enumeration
    }

    console.log('=== FORGOT PASSWORD RESPONSE ===');
    return res.json({ 
      success: true,
      message: 'If this email exists, a reset link has been sent. Please check your inbox and spam folder.' 
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Unable to process request. Please try again later.' 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    console.log('=== RESET PASSWORD REQUEST ===');
    const rawToken = req.params.token;
    const { password, confirmPassword } = req.body;
    
    console.log('Token received (first 10 chars):', rawToken ? rawToken.substring(0, 10) : 'NONE');
    console.log('Password provided:', password ? 'YES' : 'NO');
    console.log('Confirm password provided:', confirmPassword ? 'YES' : 'NO');

    if (!password || !confirmPassword) {
      console.log('Error: Password or confirmation missing');
      return res.status(400).json({ 
        success: false,
        message: 'Password and confirmation are required' 
      });
    }

    if (password !== confirmPassword) {
      console.log('Error: Passwords do not match');
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (!isStrongPassword(password)) {
      console.log('Error: Password is too weak');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters and include a number and special character' 
      });
    }

    // Hash the token to match what's stored in database
    const hashedToken = hashToken(rawToken);
    console.log('Hashed token for lookup (first 10 chars):', hashedToken.substring(0, 10));
    
    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      console.log('Error: No user found with valid token');
      
      // Check if token exists but expired
      const expiredUser = await User.findOne({ resetPasswordToken: hashedToken });
      if (expiredUser) {
        console.log('Token found but expired for user:', expiredUser.email);
      } else {
        console.log('Token not found in database');
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    console.log('✅ Valid token found for user:', user.email);
    console.log('User ID:', user._id);
    console.log('User type:', user.user_type);

    // Hash new password with bcrypt (using 12 rounds for better security)
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('New password hashed successfully');

    // Update user password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate old JWT tokens
    user.updated_at = new Date();
    
    await user.save();
    console.log('✅ Password updated successfully in database');

    // Determine role for redirect
    const role = user.user_type === 'user' ? 'buyer' : user.user_type;
    console.log('User role for redirect:', role);

    console.log('=== RESET PASSWORD SUCCESS ===');
    return res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      role
    });
  } catch (error) {
    console.error('❌ Reset password error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Unable to reset password. Please try again or request a new reset link.' 
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters' 
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate old tokens
    user.updated_at = new Date();
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
};

const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email is already in use by another user
    const existingUser = await User.findOne({ 
      email: normalizedEmail,
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = normalizedEmail;
    user.updated_at = new Date();
    
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Email updated successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ message: 'Failed to update email' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateEmail
};
