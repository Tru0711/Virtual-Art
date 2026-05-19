const nodemailer = require('nodemailer');

const DEFAULT_SEND_TIMEOUT_MS = 8000;
const DEFAULT_VERIFY_TIMEOUT_MS = 10000;
const DEFAULT_DEDUPE_WINDOW_MS = 10000;

let transporterPromise;

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const redactEmailAddress = (value) => {
  if (!value) return 'MISSING';
  return String(value).replace(/(^.).*(@.*$)/, '$1***$2');
};

const normalizeError = (error, stage) => {
  if (error?.code === 'EMAIL_TIMEOUT') {
    return error;
  }

  const normalized = new Error(error?.message || `Failed to ${stage} email transport`);
  normalized.code = error?.code || 'EMAIL_TRANSPORT_FAILED';
  normalized.statusCode = error?.responseCode && error.responseCode >= 500 ? 503 : 502;
  normalized.publicMessage =
    stage === 'verify'
      ? 'Email service verification failed. Check your Brevo credentials.'
      : 'Email delivery is temporarily unavailable. Please try again.';
  normalized.responseCode = error?.responseCode;
  normalized.response = error?.response;
  normalized.command = error?.command;
  normalized.cause = error;
  return normalized;
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

const getEmailConfig = () => {
  const host = process.env.BREVO_SMTP_HOST;
  const port = readNumber(process.env.BREVO_SMTP_PORT, 587);
  const secure = readBoolean(process.env.BREVO_SMTP_SECURE, false);
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;
  const from = process.env.BREVO_SMTP_FROM;
  const sendTimeoutMs = readNumber(process.env.SMTP_SEND_TIMEOUT_MS, DEFAULT_SEND_TIMEOUT_MS);
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

const isEmailConfigComplete = (config = getEmailConfig()) => Boolean(
  config.host && config.port && config.user && config.pass && config.from
);

const buildMissingConfigError = () => {
  const error = new Error(
    'Missing Brevo SMTP configuration. Set BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_PASS, and BREVO_SMTP_FROM.'
  );
  error.code = 'EMAIL_CONFIG_MISSING';
  error.statusCode = 500;
  return error;
};

const createTransporter = (config = getEmailConfig()) => {
  if (!isEmailConfigComplete(config)) {
    throw buildMissingConfigError();
  }

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

  return nodemailer.createTransport({
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
};

const verifyTransporter = async (transporter, config = getEmailConfig()) => {
  await withTimeout(transporter.verify(), config.verifyTimeoutMs, 'SMTP verification');
  console.info('[email] SMTP transporter verified successfully', {
    provider: 'brevo',
    host: config.host,
    port: config.port,
  });
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const config = getEmailConfig();
      const transporter = createTransporter(config);

      try {
        await verifyTransporter(transporter, config);
      } catch (error) {
        transporterPromise = undefined;
        throw normalizeError(error, 'verify');
      }

      return transporter;
    })().catch((error) => {
      transporterPromise = undefined;
      throw error;
    });
  }

  return transporterPromise;
};

const resetEmailTransporter = () => {
  transporterPromise = undefined;
};

module.exports = {
  DEFAULT_SEND_TIMEOUT_MS,
  DEFAULT_VERIFY_TIMEOUT_MS,
  DEFAULT_DEDUPE_WINDOW_MS,
  getEmailConfig,
  isEmailConfigComplete,
  createTransporter,
  verifyTransporter,
  getTransporter,
  resetEmailTransporter,
  normalizeError,
  withTimeout,
};