const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config();

const app = express();
app.set('trust proxy', true);

// Parse CORS origins from environment or use development defaults
const getCorsOrigins = () => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
  }
  // If running in production and no explicit origins set, allow all origins
  // (fallback). It's recommended to set CORS_ORIGINS in production.
  if (process.env.NODE_ENV === 'production') {
    return ['*'];
  }
  return ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
};

const allowedOrigins = getCorsOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server) without origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
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

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    // When credentials are enabled, echo the origin instead of '*'
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
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

const connectMongo = async () => {
  try {
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined. Please set it in your .env file.');
    }
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    const dbName = (mongoUri.includes('/') ? mongoUri.split('/').pop().split('?')[0] : '(unknown)') || '(unknown)';
    void dbName;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

const http = require('http');
const { Server } = require('socket.io');

const startServer = async () => {
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

  io.on('connection', (socket) => {
    try {
      socket.on('joinOrderRoom', (orderId) => {
        if (orderId) socket.join(`order:${orderId}`);
      });
      socket.on('leaveOrderRoom', (orderId) => {
        if (orderId) socket.leave(`order:${orderId}`);
      });
    } catch (e) {
    }
  });

  server.listen(PORT, HOST, async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Server running on http://${HOST}:${PORT}`);
    }
    await connectMongo();
  });
};

startServer().catch((err) => {
  console.error('❌ Server failed to start:', err.message);
});

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

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  const status = err.name === 'MulterError' ? 400 : 400;
  res.status(status).json({ message: err.message || 'Upload failed' });
});

app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const mongoState =
    state === 1 ? 'connected' :
    state === 2 ? 'connecting' :
    state === 3 ? 'disconnecting' :
    'disconnected';
  res.json({ status: 'OK', message: 'VisualArt Backend is running', mongo: mongoState });
});

// Diagnostic route to verify CORS headers from deployed environment
app.get('/api/ping-cors', (req, res) => {
  const origin = req.get('Origin') || null;
  const allowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  res.json({ ok: true, origin, allowed });
});

module.exports = app;
