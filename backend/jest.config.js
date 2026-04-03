/**
 * Jest Configuration (ESM)
 */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/server.js",
    "!src/config/database.js",
    "!src/config/prisma.js",
    "!src/config/swaggerUiConfig.js",
    "!src/services/oauthService.js",
    "!src/services/socketService.js",
    "!src/services/spitRoyaleNamespace.js",
    "!src/tools/fetchSecrets.js",
    // Require real FS/TLS or complex middleware chains — covered by E2E
    "!src/lib/httpsServer.js",
    "!src/utils/uploadSecurity.js",
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 73,
      lines: 73,
      statements: 73,
    },
  },
  setupFiles: ["./tests/setup.js"],
};
