/**
 * Application Configuration
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/5
 *
 * Centralised config from environment variables.
 * See .env.example at the project root for required variables.
 */
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    name: process.env.DB_NAME || 'alpacaparty',
    user: process.env.DB_USER || 'alpacaparty',
    password: process.env.DB_PASSWORD || 'alpacaparty',
  },

  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:5173', 'https://localhost:8080'],
  },

  // Explicit frontend URL used for OAuth post-login redirects.
  // Falls back to the first CORS origin when not set.
  frontendUrl: process.env.FRONTEND_URL
    || (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0] : 'https://localhost:8080'),

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
  },

  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },

  // OAuth 2.0
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'https://localhost:3000/api/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'https://localhost:3000/api/auth/github/callback',
    },
  },

  // SSL/TLS certificates
  ssl: {
    certPath: process.env.SSL_CERT_PATH || path.resolve(__dirname, '../../ssl/cert.pem'),
    keyPath: process.env.SSL_KEY_PATH || path.resolve(__dirname, '../../ssl/key.pem'),
  },

  // Secrets loaded from Vault (production) or env vars (development).
  // apiKeys uses a getter so it always reads the current process.env value,
  // which allows Vault to populate it after module load.
  get apiKeys() {
    return new Set(
      (process.env.API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean),
    );
  },
  groqApiKey: process.env.GROQ_API_KEY || '',
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
  get modUsers() {
    return (process.env.MOD_USERS || '').split(',').map((s) => s.trim()).filter(Boolean);
  },

  // File uploads
  uploads: {
    dir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    maxSizeBytes: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/json',
      'application/xml', 'text/xml',
    ],
  },

  // Gamification
  xp: {
    perWin: 25,
    perLoss: 5,
    perDraw: 10,
    perPost: 5,
    levelThreshold: 100, // XP per level
  },
};

export default config;
