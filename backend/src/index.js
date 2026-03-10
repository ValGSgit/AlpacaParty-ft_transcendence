/**
 * Express Application Entry Point
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/2
 */
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './services/socketService.js';
import { initializePassport } from './services/oauthService.js';

const app = express();
const httpServer = createServer(app);

// Trust proxy (behind nginx reverse proxy)
app.set('trust proxy', 1);

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

// Serve uploaded files
app.use('/uploads', express.static(config.uploads.dir));

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
httpServer.listen(PORT, () => {
  console.log(`[server] AlpacaParty API running on port ${PORT} (${config.nodeEnv})`);
});

export default app;
