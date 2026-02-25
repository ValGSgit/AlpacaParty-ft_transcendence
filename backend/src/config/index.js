/**
 * Application Configuration
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/5
 *
 * Centralised config from environment variables.
 * See .env.example at the project root for required variables.
 */
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const isDev = (process.env.NODE_ENV || 'development') === 'development';

// JWT secret — must be set explicitly in production
const jwtSecret = process.env.JWT_SECRET || (isDev ? crypto.randomBytes(32).toString('hex') : null);
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // PostgreSQL connection (Issue #7)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'cleanscendence',
    user: process.env.DB_USER || 'cleanscendence',
    password: process.env.DB_PASSWORD || 'cleanscendence',
  },

  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://localhost:8080'],
  },

  rateLimit: {
    windowMs: 15 * 60 * 10000, // 15 minutes
    max: 1000,
  },

  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
};

export default config;
