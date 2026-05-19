const nodemailer = require('nodemailer');

const DEFAULT_SMTP_HOST = 'smtp-relay.brevo.com';
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_SECURE = false;
const DEFAULT_SEND_TIMEOUT_MS = 8000;
const DEFAULT_VERIFY_TIMEOUT_MS = 10000;
const DEFAULT_DEDUPE_WINDOW_MS = 10000;

let transporterPromise;
const inflightEmailSends = new Map();
const recentlySentEmails = new Map();

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getSmtpConfig = () => {
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
  const port = readNumber(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT, DEFAULT_SMTP_PORT);
  const secure = readBoolean(process.env.BREVO_SMTP_SECURE ?? process.env.SMTP_SECURE, DEFAULT_SMTP_SECURE);
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || process.env.EMAIL_ADDRESS;
  const pass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.APP_PASSWORD;
  const from = process.env.BREVO_SMTP_FROM || process.env.SMTP_FROM || process.env.EMAIL_FROM || user;
  const sendTimeoutMs = readNumber(process.env.SMTP_SEND_TIMEOUT_MS || process.env.SMTP_TIMEOUT_MS, DEFAULT_SEND_TIMEOUT_MS);
  const verifyTimeoutMs = readNumber(process.env.SMTP_VERIFY_TIMEOUT_MS, DEFAULT_VERIFY_TIMEOUT_MS);
  const dedupeWindowMs = readNumber(process.env.EMAIL_DEDUPE_WINDOW_MS, DEFAULT_DEDUPE_WINDOW_MS);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    sendTimeoutMs,
    verifyTimeoutMs,
    dedupeWindowMs,
  };
};

const redactEmailAddress = (value) => {
  if (!value) return 'MISSING';
  return String(value).replace(/(^.).*(@.*$)/, '$1***$2');
};

const withTimeout = (promise, timeoutMs, label) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`);
      error.code = 'EMAIL_TIMEOUT';
      error.statusCode = 504;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
};

const buildEmailError = (error, stage) => {
  if (error?.code === 'EMAIL_TIMEOUT') {
    return error;
  }

  const normalized = new Error(error?.message || `Failed to ${stage} email`);
  normalized.code = error?.code || 'EMAIL_SEND_FAILED';
  normalized.statusCode = error?.responseCode && error.responseCode >= 500 ? 503 : 502;
  normalized.publicMessage =
    stage === 'verify'
      ? 'Email service verification failed. Check your SMTP credentials.'
      : 'Email delivery is temporarily unavailable. Please try again.';
  normalized.responseCode = error?.responseCode;
  normalized.response = error?.response;
  normalized.command = error?.command;
  normalized.cause = error;
  return normalized;
};

const cleanupRecentCache = (dedupeWindowMs) => {
  const cutoff = Date.now() - dedupeWindowMs;
  for (const [key, value] of recentlySentEmails.entries()) {
    if (value.sentAt < cutoff) {
      recentlySentEmails.delete(key);
    }
  }
};

const getTransport = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const config = getSmtpConfig();

      console.info('[email] SMTP configuration', {
        provider: 'brevo',
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: redactEmailAddress(config.user),
        fromConfigured: Boolean(config.from),
        sendTimeoutMs: config.sendTimeoutMs,
        verifyTimeoutMs: config.verifyTimeoutMs,
      });

      if (!config.host || !config.user || !config.pass || !config.from) {
        throw new Error('Missing SMTP configuration. Set BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_PASS, and BREVO_SMTP_FROM in Render.');
      }

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
        connectionTimeout: config.sendTimeoutMs,
        greetingTimeout: config.sendTimeoutMs,
        socketTimeout: config.sendTimeoutMs,
        tls: {
          rejectUnauthorized: true,
        },
      });

      try {
        await withTimeout(transporter.verify(), config.verifyTimeoutMs, 'SMTP verification');
        console.info('[email] SMTP transporter verified successfully', {
          provider: 'brevo',
          host: config.host,
          port: config.port,
        });
      } catch (error) {
        transporterPromise = undefined;
        throw buildEmailError(error, 'verify');
      }

      return transporter;
    })().catch((error) => {
      transporterPromise = undefined;
      throw error;
    });
  }

  return transporterPromise;
};

const buildEmailKey = ({ to, subject, text, html }) => [to, subject, text || '', html || ''].join('|');

const sendEmail = async ({ to, subject, text, html, from: fromOverride }) => {
  const config = getSmtpConfig();
  const from = fromOverride || config.from;

  if (!from) {
    throw new Error('Missing SMTP_FROM configuration. Set BREVO_SMTP_FROM in Render.');
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
    const transporter = await getTransport();

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

      throw buildEmailError(error, 'send');
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