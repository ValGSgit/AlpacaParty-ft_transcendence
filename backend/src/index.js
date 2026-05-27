/**
 * Express Application Entry Point
 * @owner DavidPoetsch, ValGSgit
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "#docs/swagger.js";
import swaggerFilePubliApi from "./docs/swagger-output-public-api.json" with { type: "json" };
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
import { waitForVaultToken } from "#lib/vault.js";

const app = express();

function resolveRequestOrigin(req) {
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto || req.protocol || "https";
  return { host, proto };
}

function publicSwaggerForRequest(req) {
  const { host, proto } = resolveRequestOrigin(req);
  const spec = structuredClone(swaggerFilePubliApi);
  if (host) {
    spec.host = host;
  }
  spec.schemes = [proto];
  return spec;
}

// Create HTTPS server with certificates
const httpsServer = createHttpsServer(app);

// Trust proxy (behind nginx reverse proxy)
app.set("trust proxy", 1);

// Enforce HTTPS (check X-Forwarded-Proto header from nginx).
// Use the canonical host from config rather than req.get("host") — the latter
// is attacker-controlled (Host header / X-Forwarded-Host) and would let a
// crafted plain-HTTP request 301 to https://evil.com/<path>.
const CANONICAL_HOST = config.frontendUrl
  ? new URL(config.frontendUrl).host
  : null;
app.use((req, res, next) => {
  if (!req.secure) {
    if (config.envIsProd) {
      const host = CANONICAL_HOST || req.get("host");
      return res.redirect(301, `https://${host}${req.url}`);
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

// Body parsing — uploads use multer (multipart), not express.json. The JSON
// surface only ever carries small payloads (profile edits, posts, etc.), so
// 256 KB is plenty and avoids accepting 10 MB JSON blobs by accident.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(cookieParser());

// Passport (OAuth)
const passport = initializePassport();
app.use(passport.initialize());

// This should happen here to ensure all routes, including static file serving, are protected by the upload security check.
//  It will allow or deny access to the uploads directory based on the request's authentication and authorization status.
app.use("/uploads", uploadSecurityCheck, express.static(config.uploads.dir));

// Dev request logging
if (config.envIsDev) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API docs (Swagger UI)
if (config.envIsDev) {
  app.use(
    "/api/docs/dev",
    swaggerUi.serveFiles(swaggerSpec),
    swaggerUi.setup(swaggerSpec),
  );
}
app.use(
  "/api/docs/public",
  swaggerUi.serveFiles(swaggerFilePubliApi),
  swaggerUi.setup(null, {
    swaggerOptions: { url: "/api/docs/public/openapi.json" },
  }),
);
app.get("/api/docs/public/openapi.json", (req, res) => {
  res.json(publicSwaggerForRequest(req));
});
// Back-compat: bare /api/docs lands on the public spec so old bookmarks /
// external links keep working. (The full internal spec stays gated.)
app.get(["/api/docs", "/api/docs/"], (_req, res) =>
  res.redirect(302, "/api/docs/public/"),
);

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
      notifications: "/api/notifications",
      uploads: "/api/uploads",
      helpdesk: "/api/helpdesk",
      publicApi: "/api/public",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize WebSocket
initializeSocket(httpsServer, config.cors.origins);

// Warm the Vault token cache. The token is mounted from vault-init's
// keys volume; in normal compose ordering it's already on disk by the
// time we reach this line, but vault-init's depends_on is service_started
// (not service_completed_successfully), so a slow init still races us.
// Polling here means the first admin request — which calls Vault.read()
// — never sees a "keys file not found" crash. Dev mode (no Vault volume)
// is detected by the env var and the wait is skipped.
async function bootstrapVault() {
  if (!config.envIsProd) return;
  try {
    await waitForVaultToken({ timeoutMs: 60_000, intervalMs: 500 });
    console.log("[vault] token cached at boot");
  } catch (err) {
    // Don't crash the server — non-Vault endpoints still work. Surface
    // the error so monitoring catches it.
    console.error("[vault] could not warm token cache:", err.message);
  }
}

// Start server
const PORT = config.port;
const server = httpsServer.listen(PORT, async () => {
  console.log(
    `[server] AlpacaParty API running on port ${PORT} (${config.nodeEnv})`,
  );
  await bootstrapVault();
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
