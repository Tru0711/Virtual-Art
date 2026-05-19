const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const { connectDatabase, getMongoConnectionState } = require('./config/database');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.set('trust proxy', true);
const normalizeOrigin = (value) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed === '*') return '*';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }

  return `https://${trimmed.replace(/\/+$/, '')}`;
};

const createOriginMatcher = (pattern) => {
  const normalizedPattern = normalizeOrigin(pattern);
  if (!normalizedPattern) return null;

  if (normalizedPattern === '*') {
    return () => true;
  }

  if (normalizedPattern.includes('*')) {
    const escapedPattern = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*');
    const wildcardRegex = new RegExp(`^${escapedPattern}$`, 'i');
    return (origin) => wildcardRegex.test(normalizeOrigin(origin) || '');
  }

  return (origin) => normalizeOrigin(origin) === normalizedPattern;
};

// Parse CORS origins from environment or use development defaults
const getCorsOrigins = () => {
  const configuredOrigins = [];

  if (process.env.CORS_ORIGINS) {
    configuredOrigins.push(...process.env.CORS_ORIGINS.split(','));
  }

  if (process.env.FRONTEND_URL) {
    configuredOrigins.push(process.env.FRONTEND_URL);
  }

  configuredOrigins.push('https://virtual-art-psi.vercel.app');

  if (process.env.VERCEL_URL) {
    configuredOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (configuredOrigins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return ['https://virtual-art-psi.vercel.app'];
    }

    return ['http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
  }

  return [...new Set(configuredOrigins.map(normalizeOrigin).filter(Boolean))];
};

const allowedOrigins = getCorsOrigins();
const allowedOriginMatchers = allowedOrigins.map(createOriginMatcher).filter(Boolean);
const isAllowedOrigin = (origin) => allowedOriginMatchers.some((matches) => matches(origin));

// Top-level middleware: always add CORS headers for allowed origins early
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (!origin) return next();

  if (isAllowedOrigin(origin)) {
    const normalizedOrigin = normalizeOrigin(origin);
    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin || origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Origin,Accept,X-Requested-With');
  }
  next();
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server) without origin
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Explicitly set CORS response headers for allowed origins and log rejections.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (!origin) return next();

  if (isAllowedOrigin(origin)) {
    // When credentials are enabled, echo the origin instead of '*'
    const normalizedOrigin = normalizeOrigin(origin);
    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin || origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Origin,Accept,X-Requested-With');
    return next();
  }

  // Log rejected origins for diagnostics
  console.warn(`CORS rejection for origin: ${origin} path: ${req.path}`);

  // If this is a preflight request, respond immediately with 403
  if (req.method === 'OPTIONS') {
    res.sendStatus(403);
    return;
  }

  next();
});
app.use(express.json());

app.use('/uploads/private', (req, res) => {
  res.status(403).json({ message: 'Forbidden' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/storage/originals', express.static(path.join(__dirname, 'storage/originals')));

app.use('/storage/certificates', express.static(path.join(__dirname, 'storage/certificates')));

app.use(express.static(path.join(__dirname, 'public')));



const mongoUri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

if (!mongoUri && process.env.NODE_ENV === 'production') {
  console.error('❌ MONGODB_URI environment variable is required for production');
  process.exit(1);
}

const http = require('http');
const { Server } = require('socket.io');

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    try {
      socket.on('joinOrderRoom', (orderId) => {
        if (orderId) socket.join(`order:${orderId}`);
      });
      socket.on('leaveOrderRoom', (orderId) => {
        if (orderId) socket.leave(`order:${orderId}`);
      });
    } catch (e) {
      console.warn('Socket room handler error:', e?.message || e);
    }
  });
};

const createServer = () => {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  app.locals.io = io;
  registerSocketHandlers(io);

  return server;
};

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/artist-profiles', require('./routes/artistProfiles'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/razorpay', require('./routes/razorpay'));
app.use('/api/artists', require('./routes/artists'));
app.use('/api/artworks', require('./routes/artworks'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/address', require('./routes/address'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/museum', require('./routes/museum'));

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/ping-cors') {
    return next();
  }

  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    message: 'Database connection is not ready yet. Please retry shortly.',
    db: getMongoConnectionState(),
  });
});

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  const status = err.name === 'MulterError' ? 400 : 400;
  res.status(status).json({ message: err.message || 'Upload failed' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'VisualArt Backend is running', mongo: getMongoConnectionState() });
});

// Diagnostic route to verify CORS headers from deployed environment
app.get('/api/ping-cors', (req, res) => {
  const origin = req.get('Origin') || null;
  const allowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin) || origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Origin,Accept,X-Requested-With');
  }
  res.json({ ok: true, origin, allowed });
});

const bootstrap = async () => {
  try {
    console.log('[startup] connecting to MongoDB...');
    await connectDatabase(mongoUri);
    console.log('[startup] MongoDB connection ready; starting HTTP server...');

    const server = createServer();
    server.listen(PORT, HOST, () => {
      console.log(`[startup] server listening on http://${HOST}:${PORT}`);
    });

    return server;
  } catch (error) {
    console.error('[startup] failed to initialize application:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = app;
