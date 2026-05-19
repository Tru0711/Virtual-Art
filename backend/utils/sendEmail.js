const {
  DEFAULT_DEDUPE_WINDOW_MS,
  getEmailConfig,
  getTransporter,
  normalizeError,
  withTimeout,
} = require('../config/email');

const inflightEmailSends = new Map();
const recentlySentEmails = new Map();

const cleanupRecentCache = (dedupeWindowMs) => {
  const cutoff = Date.now() - dedupeWindowMs;
  for (const [key, value] of recentlySentEmails.entries()) {
    if (value.sentAt < cutoff) {
      recentlySentEmails.delete(key);
    }
  }
};

const buildEmailKey = ({ to, subject, text, html }) => [to, subject, text || '', html || ''].join('|');

const sendEmail = async ({ to, subject, text, html, from: fromOverride }) => {
  const config = getEmailConfig();
  const from = fromOverride || config.from;

  if (!from) {
    const error = new Error('Missing Brevo sender configuration. Set BREVO_SMTP_FROM.');
    error.code = 'EMAIL_FROM_MISSING';
    error.statusCode = 500;
    throw error;
  }

  const emailKey = buildEmailKey({ to, subject, text, html });
  cleanupRecentCache(config.dedupeWindowMs);

  if (recentlySentEmails.has(emailKey)) {
    const cached = recentlySentEmails.get(emailKey);
    console.info('[email] deduplicated recently-sent email', {
      to,
      subject,
      messageId: cached.messageId || 'cached',
    });
    return cached.info;
  }

  if (inflightEmailSends.has(emailKey)) {
    console.info('[email] joining in-flight send', { to, subject });
    return inflightEmailSends.get(emailKey);
  }

  console.info('[email] sending email', {
    provider: 'brevo',
    to,
    subject,
    from,
  });

  const sendPromise = (async () => {
    const transporter = await getTransporter();

    try {
      const info = await withTimeout(
        transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        }),
        config.sendTimeoutMs,
        'SMTP send'
      );

      console.info('[email] sent successfully', {
        to,
        subject,
        messageId: info.messageId,
        response: info.response,
      });

      recentlySentEmails.set(emailKey, {
        sentAt: Date.now(),
        messageId: info.messageId,
        info,
      });

      return info;
    } catch (error) {
      console.error('[email] send failed', {
        to,
        subject,
        code: error?.code,
        message: error?.message,
      });

      throw normalizeError(error, 'send');
    }
  })();

  inflightEmailSends.set(emailKey, sendPromise);

  try {
    return await sendPromise;
  } finally {
    inflightEmailSends.delete(emailKey);
  }
};

/**
 * Send certificate achievement email to artist
 */
const sendCertificateEmail = async (artistEmail, artistName, level, artworkCount) => {
  const levelInfo = {
    bronze: { displayName: 'Bronze', emoji: '🥉', color: '#CD7F32' },
    silver: { displayName: 'Silver', emoji: '🥈', color: '#C0C0C0' },
    gold: { displayName: 'Gold', emoji: '🥇', color: '#FFD700' },
  };

  const info = levelInfo[String(level || '').toLowerCase()] || { displayName: level, emoji: '🎖️', color: '#D3D3D3' };

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
              <a href="${(process.env.FRONTEND_URL || 'https://virtual-art-psi.vercel.app').replace(/\/$/, '')}/artist/certificates" class="cta-button">View Your Certificate</a>
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
    html,
  });
};

/**
 * Send certificate revocation email to artist
 */
const sendCertificateRevocationEmail = async (artistEmail, artistName, level, reason) => {
  const levelInfo = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
  };

  const displayLevel = levelInfo[String(level || '').toLowerCase()] || level;

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
    html,
  });
};

module.exports = {
  sendEmail,
  sendCertificateEmail,
  sendCertificateRevocationEmail,
};