/**
 * Jest global setup — set env vars for tests
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cleanscendence_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
