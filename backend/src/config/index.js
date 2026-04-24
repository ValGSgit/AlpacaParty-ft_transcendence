/**
 * Application Configuration
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/5
 *
 * Centralised config from environment variables.
 * See .env.example at the project root for required variables.
 */
import dotenv from "dotenv";
import { validateConfig } from "./validateConfig.js";
import ms from "ms";

dotenv.config({ path: "/run/secrets/.env" });

const config = {
  port: parseInt(process.env.API_PORT, 10), // needed fallback for testing
  nodeEnv: process.env.NODE_ENV,
  envIsProd: process.env.NODE_ENV === "production",
  envIsDev: process.env.NODE_ENV === "development",

  jwt: {
    secret: process.env.JWT_SECRET,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: ms(process.env.JWT_EXPIRES_IN),
      path: "/",
    },
    cookieOptionsRefresh: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: ms(process.env.JWT_REFRESH_EXPIRES_IN),
      path: "/api/auth/refresh",
    },
  },

  // PostgreSQL connection (Issue #7)
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : null,
  },

  // Explicit frontend URL used for OAuth post-login redirects.
  // Falls back to the first CORS origin when not set.
  frontendUrl: process.env.FRONTEND_URL,

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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        "https://localhost:8443/api/auth/google/callback",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        "https://localhost:8443/api/auth/github/callback",
    },
  },

  // SSL/TLS certificates
  ssl: {
    certPath: process.env.SSL_CERT_PATH,
    keyPath: process.env.SSL_KEY_PATH,
  },

  // Secrets loaded from Vault (production) or env vars (development).
  // apiKeys uses a getter so it always reads the current process.env value,
  // which allows Vault to populate it after module load.
  get apiKeys() {
    return new Set(
      (process.env.API_KEYS || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    );
  },
  get modUsers() {
    return (process.env.MOD_USERS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },

  // File uploads
  uploads: {
    dir: process.env.UPLOAD_DIR,
    maxSizeBytes: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/json",
      "application/xml",
      "text/xml",
    ],
    // NOTE: image/svg+xml intentionally excluded. SVG is script-capable,
    // so even when upload is allowed (see allowedMimeTypes), we never serve
    // it inline — uploadSecurity.js forces Content-Disposition: attachment
    // for any mime type not listed here.
    imageMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
};

export default config;

validateConfig();
