/**
 * Express Application Entry Point
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/2
 */
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
// TODO: Import and initialize socket service (WebSockets issue)
// import { initializeSocket } from './services/socketService.js';

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
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// TODO: Initialize Passport for OAuth (Issue #8, OAuth issue)
// app.use(passport.initialize());

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
    name: 'Cleanscendence API',
    version: '0.0.1',
    endpoints: {
      health: '/api/health',
      // TODO: Uncomment as routes are implemented (Issue #9)
      // auth: '/api/auth',
      // users: '/api/users',
      // friends: '/api/friends',
      // chat: '/api/chat',
      // game: '/api/game',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// TODO: Initialize WebSocket (WebSockets issue)
// initializeSocket(httpServer);

// Start server
const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`[server] Cleanscendence API running on port ${PORT} (${config.nodeEnv})`);
});

export default app;
