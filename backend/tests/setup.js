/**
 * Jest global setup — set env vars for tests
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-for-unit-tests";
process.env.JWT_PUBLIC_API_SECRET = "test-jwt-refresh-secret-for-unit-tests";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
process.env.JWT_PUBLIC_API_EXPIRES_IN =
process.env.JWT_PUBLIC_API_EXPIRES_IN || "30d";
process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret-for-unit-tests";

process.env.CORS_ORIGINS =
  process.env.CORS_ORIGINS || "https://localhost:8443,http://localhost:5173";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:8443";

process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_PORT = process.env.DB_PORT || "5432";
process.env.DB_NAME = process.env.DB_NAME || "alpacaparty_test";
process.env.DB_USER = process.env.DB_USER || "alpacaparty";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "alpacaparty";

process.env.SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./ssl/cert.pem";
process.env.SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./ssl/key.pem";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

if (!process.env.PORT) {
  process.env.PORT = process.env.API_PORT || "3000";
}
