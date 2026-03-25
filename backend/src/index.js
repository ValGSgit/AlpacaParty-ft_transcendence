/**
 * Express Application Entry Point
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/2
 */
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './services/socketService.js';
import { initializePassport } from './services/oauthService.js';
import prisma from './config/prisma.js';

const app = express();

// Create HTTPS server with certificates
let httpServer;
let useHttps = false;

const isProd = config.nodeEnv === 'production';

if (config.ssl.certPath && config.ssl.keyPath) {
  try {
    if (!fs.existsSync(config.ssl.certPath)) {
      throw new Error(`Certificate file not found: ${config.ssl.certPath}`);
    }
    if (!fs.existsSync(config.ssl.keyPath)) {
      throw new Error(`Key file not found: ${config.ssl.keyPath}`);
    }
    const key = fs.readFileSync(config.ssl.keyPath, 'utf8');
    const cert = fs.readFileSync(config.ssl.certPath, 'utf8');
    httpServer = https.createServer({ key, cert }, app);
    useHttps = true;
    console.log('[ssl] ✓ HTTPS enabled with certificates from', config.ssl.certPath);
  } catch (err) {
    /* Now you must*/
    throw new Error(`[ssl] SSL certificates required in production but failed to load: ${err.message}`);
    console.warn(`[ssl] Failed to load certificates: ${err.message}`);
    console.warn('[ssl] Falling back to HTTP (development only)');
  }
}

// Fallback to HTTP — development only
if (!useHttps) {
    throw new Error('[ssl] SSL certificates are required in production but were not configured');
  /* If you need to make sure for some weird reason feel free to uncomment
  httpServer = http.createServer(app);
  console.warn('[ssl] ⚠ Backend running on HTTP - certificates not properly configured');*/
}

// Trust proxy (behind nginx reverse proxy)
app.set('trust proxy', 1);

// Enforce HTTPS (check X-Forwarded-Proto header from nginx)
app.use((req, res, next) => {
  const proto = req.get('X-Forwarded-Proto');
  if (proto === 'http') {
    if (isProd) {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    console.warn(`[ssl] Non-HTTPS request received: ${req.method} ${req.path}`);
  }
  next();
});

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*.googleusercontent.com', '*.githubusercontent.com', 'picsum.photos', '*.picsum.photos', 'https://images.pexels.com'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting
app.use('/api', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport (OAuth)
const passport = initializePassport();
app.use(passport.initialize());

// Serve uploaded files — force download to prevent SVG/HTML XSS in app origin
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(config.uploads.dir));

// Dev request logging
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'AlpacaParty API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      friends: '/api/friends',
      chat: '/api/chat',
      game: '/api/game',
      posts: '/api/posts',
      organizations: '/api/organizations',
      notifications: '/api/notifications',
      uploads: '/api/uploads',
      admin: '/api/admin',
      publicApi: '/api/public',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize WebSocket
initializeSocket(httpServer, config.cors.origins);

// Start server
const PORT = config.port;
const server = httpServer.listen(PORT, () => {
  console.log(`[server] AlpacaParty API running on port ${PORT} (${config.nodeEnv})`);
});

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('[prisma] disconnect error:', err.message);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => { shutdown('SIGINT'); });
process.on('SIGTERM', () => { shutdown('SIGTERM'); });

export default app;
