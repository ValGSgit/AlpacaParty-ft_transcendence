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
  ],
  coverageThreshold: {
    global: {
      branches: 66,
      functions: 66,
      lines: 66,
      statements: 66,
    },
  },
  setupFiles: ['./tests/setup.js'],
};
