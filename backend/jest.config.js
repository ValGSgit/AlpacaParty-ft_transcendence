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
    '!src/config/database.js',
    '!src/services/oauthService.js',
    '!src/services/socketService.js',
  ],
  coverageThreshold: {
    global: {
      branches: 58,
      functions: 63,
      lines: 66,
      statements: 66,
    },
  },
  setupFiles: ['./tests/setup.js'],
};
