/**
 * Jest global setup — set env vars for tests
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
if (!process.env.PORT) {
	process.env.PORT = process.env.API_PORT || "3000";
}
