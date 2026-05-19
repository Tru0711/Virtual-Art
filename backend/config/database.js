const mongoose = require('mongoose');

let connectPromise = null;
let listenersAttached = false;

const logState = (label, details = {}) => {
  console.log(`[db] ${label}`, details);
};

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logState('connected', { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on('reconnecting', () => {
    logState('reconnecting', { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on('reconnected', () => {
    logState('reconnecting', { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on('disconnected', () => {
    logState('disconnected', { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on('error', (error) => {
    console.error('[db] failed', {
      message: error.message,
      name: error.name,
    });
  });
};

const getMongoConnectionState = () => {
  const state = mongoose.connection.readyState;
  return {
    readyState: state,
    status:
      state === 1 ? 'connected' :
      state === 2 ? 'connecting' :
      state === 3 ? 'disconnecting' :
      'disconnected',
  };
};

const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  attachConnectionListeners();

  connectPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    })
    .then(() => {
      logState('connected', getMongoConnectionState());
      return mongoose.connection;
    })
    .catch((error) => {
      connectPromise = null;
      console.error('[db] failed', {
        message: error.message,
        name: error.name,
      });
      throw error;
    });

  return connectPromise;
};

module.exports = {
  connectDatabase,
  getMongoConnectionState,
};