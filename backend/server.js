const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config();

const app = express();

// Parse CORS origins from environment or use development defaults
const getCorsOrigins = () => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
  }
  return ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
};

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

module.exports = app;
