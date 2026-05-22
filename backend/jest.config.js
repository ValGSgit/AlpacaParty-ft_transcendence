/**
 * Jest Configuration (ESM)
 */
export default {
  testEnvironment: "node",
  transform: {},
  forceExit: true,
  testMatch: ["**/tests/**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/server.js",
    "!src/config/database.js",
    "!src/config/prisma.js",
    "!src/services/oauthService.js",
    "!src/services/socketService.js",
    "!src/services/spitRoyaleNamespace.js",
    "!src/tools/fetchSecrets.js",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "src/config/helmet.js",
    "src/config/swagger.js",
    "src/config/swaggerUiConfig.js",
    "src/lib/httpsServer.js",
    "src/utils/pagination.js",
    "src/utils/uploadSecurity.js",
    "src/services/spitRoyaleNamespace_legacy.js",
  ],
  coverageThreshold: {
    global: {
      branches: 68,
      functions: 73,
      lines: 73,
      statements: 73,
    },
  },
  setupFiles: ["./tests/setup.js"],
};
