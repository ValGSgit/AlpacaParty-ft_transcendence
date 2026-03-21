/**
 * Jest Configuration (ESM)
 */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/server.js',
    '!src/config/database.js',
    '!src/config/prisma.js',
    '!src/services/oauthService.js',
    '!src/services/socketService.js',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 73,
      lines: 73,
      statements: 73,
    },
  },
  setupFiles: ['./tests/setup.js'],
};
