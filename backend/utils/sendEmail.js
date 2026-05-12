const nodemailer = require('nodemailer');

let transportPromise;

const getTransport = async () => {
  if (!transportPromise) {
    transportPromise = (async () => {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER || process.env.EMAIL_ADDRESS;
      const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.APP_PASSWORD;

      console.log('=== SMTP Configuration ===');
      console.log('SMTP_HOST:', host ? 'SET' : 'MISSING');
      console.log('SMTP_PORT:', port);
      console.log('SMTP_USER:', user ? user : 'MISSING');
      console.log('SMTP_PASS:', pass ? '***SET***' : 'MISSING');

      if (!host || !user || !pass) {
        throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, and either SMTP_USER/SMTP_PASS or EMAIL_ADDRESS with EMAIL_PASSWORD/APP_PASSWORD.');
      }

      const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
      console.log('SMTP_SECURE:', secure);

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        debug: true, // Enable debug output
        logger: true // Enable logger
      });

      // Verify transporter configuration
      try {
        await transporter.verify();
        console.log('✅ SMTP transporter verified successfully');
      } catch (verifyError) {
        console.error('❌ SMTP transporter verification failed:', verifyError.message);
        throw verifyError;
      }

      return transporter;
    })();
  }

  return transportPromise;
};

const sendEmail = async ({ to, subject, text, html }) => {
  console.log('=== SENDING EMAIL ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_ADDRESS;
  if (!from) {
    throw new Error('SMTP_FROM is missing. Please set SMTP_FROM environment variable.');
  }
  console.log('From:', from);

  const transport = await getTransport();
  
  try {
    const info = await transport.sendMail({ 
      from, 
      to, 
      subject, 
      text, 
      html 
    });
    
    console.log('✅ Email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

/**
 * Send certificate achievement email to artist
 */
const sendCertificateEmail = async (artistEmail, artistName, level, artworkCount) => {
  const levelInfo = {
    bronze: { displayName: 'Bronze', emoji: '🥉', color: '#CD7F32' },
    silver: { displayName: 'Silver', emoji: '🥈', color: '#C0C0C0' },
    gold: { displayName: 'Gold', emoji: '🥇', color: '#FFD700' }
  };

  const info = levelInfo[level.toLowerCase()] || { displayName: level, emoji: '🎖️', color: '#D3D3D3' };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
          .badge { font-size: 48px; margin: 10px 0; }
          .content { padding: 20px 0; }
          .achievement-box {
            background-color: ${info.color};
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .stats { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .stat-item { margin: 10px 0; }
          .cta-button {
            display: inline-block;
            background-color: #007BFF;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">${info.emoji}</div>
            <h1>Congratulations!</h1>
            <p>You've achieved a new milestone!</p>
          </div>

          <div class="content">
            <p>Dear ${artistName},</p>

            <p>We are thrilled to recognize your exceptional dedication and creativity in digital art!</p>

            <div class="achievement-box">
              <h2>${info.displayName} Level Certificate</h2>
              <p>For creating ${artworkCount} approved artworks</p>
            </div>

            <p>Your outstanding contribution to the VisualArt community has been acknowledged with this prestigious digital certificate. This certificate is a testament to your hard work and artistic excellence.</p>

            <div class="stats">
              <div class="stat-item"><strong>Achievement:</strong> ${info.displayName} Level</div>
              <div class="stat-item"><strong>Approved Artworks:</strong> ${artworkCount}</div>
              <div class="stat-item"><strong>Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            <p>You can now download your certificate from your artist dashboard. Display it proudly to showcase your achievements!</p>

            <center>
              <a href="${process.env.FRONTEND_URL || 'https://yourplatform.com'}/artist/certificates" class="cta-button">View Your Certificate</a>
            </center>

            <p style="margin-top: 30px;">Keep creating and pushing the boundaries of artistic expression. The next milestone awaits!</p>

            <p>Best regards,<br>The VisualArt Team</p>
          </div>

          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} VisualArt. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: artistEmail,
    subject: `🎉 Congratulations! You've Earned Your ${info.displayName} Level Certificate!`,
    text: `Congratulations! You have achieved the ${info.displayName} level certificate with ${artworkCount} approved artworks. Visit your dashboard to download it.`,
    html
  });
};

/**
 * Send certificate revocation email to artist
 */
const sendCertificateRevocationEmail = async (artistEmail, artistName, level, reason) => {
  const levelInfo = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold'
  };

  const displayLevel = levelInfo[level.toLowerCase()] || level;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .warning-box { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; border-radius: 4px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Certificate Revocation Notice</h2>

          <div class="warning-box">
            <p><strong>Your ${displayLevel} Level Certificate has been revoked.</strong></p>
          </div>

          <p>Dear ${artistName},</p>

          <p>We regret to inform you that your ${displayLevel} Level Certificate has been revoked effective immediately.</p>

          <h3>Reason for Revocation:</h3>
          <p>${reason || 'No specific reason provided'}</p>

          <p>If you believe this revocation was made in error or wish to discuss this further, please contact our support team.</p>

          <p>Thank you for your understanding.</p>

          <p>Best regards,<br>The VisualArt Team</p>

          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} VisualArt. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: artistEmail,
    subject: `Certificate Revocation Notice - ${displayLevel} Level`,
    text: `Your ${displayLevel} Level Certificate has been revoked. Reason: ${reason || 'Not specified'}`,
    html
  });
};

module.exports = { sendEmail, sendCertificateEmail, sendCertificateRevocationEmail };
