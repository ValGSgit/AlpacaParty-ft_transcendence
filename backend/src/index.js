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
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import swaggerSpec from './config/swagger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './services/socketService.js';
import { initializePassport } from './services/oauthService.js';
import { authenticate } from './middleware/auth.js';
import File from './models/File.js';
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

// Serve uploaded files.
// Images (used in <img> tags on public profiles/posts) are served without auth — they are
// intentionally public social content and browsers cannot send auth headers for <img src>.
// Non-image types (PDF, CSV, JSON, XML, text) require a valid JWT so private documents
// are not accessible to unauthenticated callers.
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

app.use('/uploads', async (req, res, next) => {
  // Strip leading slash to get the stored filename
  const storedName = req.path.replace(/^\//, '');
  if (!storedName) return next();

  try {
    const record = await File.findByStoredName(storedName);

    // File not tracked in DB — deny to prevent serving orphaned files
    if (!record) return res.status(404).json({ error: { message: 'File not found' } });

    // Non-image files require authentication
    if (!IMAGE_MIME_TYPES.has(record.mimeType)) {
      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => (err ? reject(err) : resolve()));
      });
      // authenticate() replies with 401 if the token is missing/invalid — if we reach
      // here, req.user is set and the requester is authenticated.
      if (record.uploaderId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: { message: 'Access denied' } });
      }
    }
  } catch {
    return res.status(500).json({ error: { message: 'File access check failed' } });
  }

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

// API docs (Swagger UI)
const swaggerUiOptions = {
  customCss: `
    body { background: #0a0a12 !important; }
    .swagger-ui { background: #0a0a12; color: #e0e0e0; }
    .swagger-ui .topbar { background: #0d0d1a; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui .topbar .download-url-wrapper .select-label span,
    .swagger-ui .topbar .download-url-wrapper input[type=text] { color: #e0e0e0; background: #1a1a2e; border-color: #00f0ff33; }
    .swagger-ui .info .title { color: #00f0ff; }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table thead tr td,
    .swagger-ui .info table thead tr th { color: #c0c0d0; }
    .swagger-ui .info a { color: #00f0ff; }
    .swagger-ui .scheme-container { background: #0d0d1a; box-shadow: none; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui section.models, .swagger-ui section.models.is-open h4 { background: #0d0d1a; border-color: #1a1a2e; }
    .swagger-ui section.models h4 { color: #00f0ff; }
    .swagger-ui .model-title { color: #00f0ff; }
    .swagger-ui .model { color: #c0c0d0; }
    .swagger-ui .opblock-tag { color: #e0e0e0; border-bottom: 1px solid #1a1a2e; }
    .swagger-ui .opblock-tag:hover { background: #0d0d1a; }
    .swagger-ui .opblock { border-color: #1a1a2e; background: #0d0d1a; }
    .swagger-ui .opblock .opblock-summary { border-color: #1a1a2e; }
    .swagger-ui .opblock .opblock-summary-description { color: #c0c0d0; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #00f0ff44; }
    .swagger-ui .opblock.opblock-get { background: #00f0ff08; border-color: #00f0ff33; }
    .swagger-ui .opblock.opblock-post { background: #00cc6608; border-color: #00cc6633; }
    .swagger-ui .opblock.opblock-put { background: #ff8c0008; border-color: #ff8c0033; }
    .swagger-ui .opblock.opblock-delete { background: #ff004408; border-color: #ff004433; }
    .swagger-ui .opblock-body pre.microlight { background: #0a0a12; color: #c0c0d0; }
    .swagger-ui textarea { background: #0a0a12; color: #c0c0d0; border-color: #1a1a2e; }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=search],
    .swagger-ui input[type=email] { background: #0d0d1a; color: #e0e0e0; border-color: #1a1a2e; }
    .swagger-ui select { background: #0d0d1a; color: #e0e0e0; border-color: #1a1a2e; }
    .swagger-ui .btn { background: #1a1a2e; color: #e0e0e0; border-color: #00f0ff44; }
    .swagger-ui .btn.execute { background: #00f0ff22; border-color: #00f0ff; color: #00f0ff; }
    .swagger-ui .btn.execute:hover { background: #00f0ff44; }
    .swagger-ui .btn.authorize { background: #00cc6622; border-color: #00cc66; color: #00cc66; }
    .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: #c0c0d0; }
    .swagger-ui table thead tr th, .swagger-ui table thead tr td { color: #00f0ff; border-color: #1a1a2e; }
    .swagger-ui table tbody tr td { color: #c0c0d0; border-color: #1a1a2e; }
    .swagger-ui .parameter__name { color: #00f0ff; }
    .swagger-ui .parameter__type { color: #c084fc; }
    .swagger-ui .parameter__in { color: #86efac; }
    .swagger-ui .tab li { color: #c0c0d0; }
    .swagger-ui .tab li.active { color: #00f0ff; }
    .swagger-ui .highlight-code { background: #0a0a12; }
    .swagger-ui .response-col_status { color: #00f0ff; }
    .swagger-ui .markdown p, .swagger-ui .markdown li { color: #c0c0d0; }
    .swagger-ui .markdown code { background: #1a1a2e; color: #00f0ff; padding: 1px 4px; border-radius: 3px; }
    .swagger-ui .markdown pre { background: #0d0d1a; border: 1px solid #1a1a2e; }
  `,
  customSiteTitle: 'AlpacaParty API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    syntaxHighlight: { theme: 'monokai' },
  },
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

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
