import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  host: process.env.HOST || '0.0.0.0',

  // Database
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || null,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false
  },

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    expiresIn: '24h'
  },
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty'
  },

  // Game settings
  game: {
    maxPlayers: parseInt(process.env.MAX_PLAYERS, 10) || 8,
    cardsPerPlayer: parseInt(process.env.CARDS_PER_PLAYER, 10) || 5,
    timeoutMinutes: parseInt(process.env.GAME_TIMEOUT_MINUTES, 10) || 30
  },

  // Rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // External services
  ngrok: {
    authToken: process.env.NGROK_AUTHTOKEN || null
  }
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  const required = [];

  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'your-jwt-secret-change-in-production') {
      required.push('JWT_SECRET');
    }
    if (config.sessionSecret === 'your-session-secret-change-in-production') {
      required.push('SESSION_SECRET');
    }
  }

  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
}

// Validate configuration on import
validateConfig();
