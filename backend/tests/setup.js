/**
 * Jest global setup — set env vars before any module loads.
 *
 * This file runs before each test module via jest.config.js `setupFiles`.
 * All values here must satisfy validateConfig() so importing config/index.js
 * does not throw in unit and integration tests.
 */

// ── Runtime ─────────────────────────────────────────────────────────────────
process.env.NODE_ENV       = "test";
process.env.PORT           = "3000";

// ── Database (mocked in most tests; real DB only in users.routes.test.js) ───
process.env.DB_HOST        = "localhost";
process.env.DB_PORT        = "5432";
process.env.DB_NAME        = "alpacaparty_test";
process.env.DB_USER        = "alpacaparty";
process.env.DB_PASSWORD    = "alpacaparty_test";

// ── JWT ──────────────────────────────────────────────────────────────────────
process.env.JWT_SECRET          = "test-jwt-secret-for-unit-tests";
process.env.JWT_EXPIRES_IN      = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

// ── SSL (dummy paths — validateConfig only checks presence, not file existence) ─
process.env.SSL_CERT_PATH  = "/tmp/test-cert.pem";
process.env.SSL_KEY_PATH   = "/tmp/test-key.pem";

// ── Uploads ──────────────────────────────────────────────────────────────────
process.env.UPLOAD_DIR     = "/tmp/alpacaparty-test-uploads";

// ── CORS / Frontend ──────────────────────────────────────────────────────────
process.env.CORS_ORIGINS   = "http://localhost:5173,https://localhost:8443";
process.env.FRONTEND_URL   = "https://localhost:8443";
