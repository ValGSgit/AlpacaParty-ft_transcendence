/**
 * Express Application Entry Point
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/2
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "#config/swagger.js";
import config from "#config/index.js";
import routes from "#routes/index.js";
import prisma from "#config/prisma.js";
import cookieParser from "cookie-parser";
import { errorHandler, notFoundHandler } from "#middleware/errorHandler.js";
import { initializeSocket } from "#services/socketService.js";
import { initializePassport } from "#services/oauthService.js";
import { createHttpsServer } from "#lib/httpsServer.js";
import { getHelmetConfig } from "#config/helmet.js";
import { uploadSecurityCheck } from "#utils/uploadSecurity.js";

const app = express();

// Create HTTPS server with certificates
const httpsServer = createHttpsServer(app);

// Trust proxy (behind nginx reverse proxy)
app.set("trust proxy", 1);

// Enforce HTTPS (check X-Forwarded-Proto header from nginx)
app.use((req, res, next) => {
  if (!req.secure) {
    if (config.envIsProd) {
      return res.redirect(301, `https://${req.get("host")}${req.url}`);
    }
    console.warn(`[ssl] Non-HTTPS request received: ${req.method} ${req.path}`);
  }
  next();
});

// Helmet security
app.use(helmet(getHelmetConfig()));

// CORS
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }),
);

// Rate limiting — skip /api/health so monitoring probes and post-load
// recovery checks are never throttled even under load-test pressure.
app.use(
  "/api",
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/api/health",
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Passport (OAuth)
const passport = initializePassport();
app.use(passport.initialize());

// todo maybe remove from here and aus api/upload routes ?
// uploads
app.use("/uploads", uploadSecurityCheck, express.static(config.uploads.dir));

// Dev request logging
if (config.envIsDev) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API docs (Swagger UI)
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "AlpacaParty API",
    version: "0.1.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      friends: "/api/friends",
      chat: "/api/chat",
      game: "/api/game",
      posts: "/api/posts",
      organizations: "/api/organizations",
      notifications: "/api/notifications",
      uploads: "/api/uploads",
      admin: "/api/admin",
      publicApi: "/api/public",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize WebSocket
initializeSocket(httpsServer, config.cors.origins);

// Start server
const PORT = config.port;
const server = httpsServer.listen(PORT, () => {
  console.log(
    `[server] AlpacaParty API running on port ${PORT} (${config.nodeEnv})`,
  );
});

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("[prisma] disconnect error:", err.message);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

export default app;
