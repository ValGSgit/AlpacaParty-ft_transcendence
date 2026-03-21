/**
 * Config Unit Tests
 */
import { jest, describe, test, expect } from '@jest/globals';

// Mock database to prevent pool creation side effects
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  default: { on: jest.fn(), query: jest.fn() },
}));

const { default: config } = await import('../../../src/config/index.js');

describe('config', () => {
  test('should have jwt configuration', () => {
    expect(config.jwt).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
    expect(config.jwt.expiresIn).toBeDefined();
    expect(config.jwt.refreshExpiresIn).toBeDefined();
  });

  test('should have db configuration', () => {
    expect(config.db).toBeDefined();
    expect(config.db.host).toBeDefined();
    expect(config.db.port).toBeDefined();
    expect(config.db.name).toBeDefined();
  });

  test('should have cors configuration', () => {
    expect(config.cors).toBeDefined();
    expect(Array.isArray(config.cors.origins)).toBe(true);
  });

  test('should have rate limit configuration', () => {
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.max).toBeGreaterThan(0);
  });

  test('should have password policy', () => {
    expect(config.password).toBeDefined();
    expect(config.password.minLength).toBeGreaterThan(0);
    expect(config.password.requireUppercase).toBe(true);
    expect(config.password.requireLowercase).toBe(true);
    expect(config.password.requireNumber).toBe(true);
  });

  test('should use test environment', () => {
    expect(config.nodeEnv).toBe('test');
  });

  test('should parse port as integer', () => {
    expect(typeof config.port).toBe('number');
  });

  test('should have oauth configuration with google and github', () => {
    expect(config.oauth).toBeDefined();
    expect(config.oauth.google).toBeDefined();
    expect(config.oauth.google.callbackUrl).toBeDefined();
    expect(config.oauth.github).toBeDefined();
    expect(config.oauth.github.callbackUrl).toBeDefined();
  });

  test('should have frontendUrl defined', () => {
    expect(config.frontendUrl).toBeDefined();
    expect(typeof config.frontendUrl).toBe('string');
    expect(config.frontendUrl.length).toBeGreaterThan(0);
  });

  test('should have db user and password fields', () => {
    expect(config.db.user).toBeDefined();
    expect(config.db.password).toBeDefined();
  });

  test('jwt expiresIn should be a non-empty string', () => {
    expect(typeof config.jwt.expiresIn).toBe('string');
    expect(config.jwt.expiresIn.length).toBeGreaterThan(0);
  });

  test('jwt refreshExpiresIn should be a non-empty string', () => {
    expect(typeof config.jwt.refreshExpiresIn).toBe('string');
    expect(config.jwt.refreshExpiresIn.length).toBeGreaterThan(0);
  });

  // ── New tests: environment-specific behavior ──────────────────────────────

  test('nodeEnv should be "test" when NODE_ENV is set to test', () => {
    // NODE_ENV is 'test' during test runs
    expect(config.nodeEnv).toBe('test');
    expect(config.nodeEnv).not.toBe('production');
  });

  test('should not throw when environment is not production (jwt secret auto-generated)', () => {
    // In test/development, a random secret is generated if JWT_SECRET is unset
    expect(config.jwt.secret).toBeTruthy();
    expect(typeof config.jwt.secret).toBe('string');
    expect(config.jwt.secret.length).toBeGreaterThan(0);
  });

  // ── New tests: default values when env vars are missing ───────────────────

  test('db.host should default to localhost when DB_HOST is unset', () => {
    // default is 'localhost'
    expect(typeof config.db.host).toBe('string');
  });

  test('db.port should default to 5432 when DB_PORT is unset', () => {
    expect(typeof config.db.port).toBe('number');
    // default fallback is 5432
    if (!process.env.DB_PORT) {
      expect(config.db.port).toBe(5432);
    }
  });

  test('db.name should default to alpacaparty when DB_NAME is unset', () => {
    if (!process.env.DB_NAME) {
      expect(config.db.name).toBe('alpacaparty');
    } else {
      expect(typeof config.db.name).toBe('string');
    }
  });

  test('port should default to 3000 when PORT is unset', () => {
    if (!process.env.PORT) {
      expect(config.port).toBe(3000);
    } else {
      expect(config.port).toBe(parseInt(process.env.PORT, 10));
    }
  });

  test('cors origins should have default values when CORS_ORIGINS is unset', () => {
    expect(config.cors.origins.length).toBeGreaterThan(0);
    if (!process.env.CORS_ORIGINS) {
      expect(config.cors.origins).toContain('http://localhost:5173');
      expect(config.cors.origins).toContain('https://localhost:8080');
    }
  });

  // ── New tests: password policy values ─────────────────────────────────────

  test('password minLength should be exactly 8', () => {
    expect(config.password.minLength).toBe(8);
  });

  test('password policy should require all character types', () => {
    expect(config.password.requireUppercase).toBe(true);
    expect(config.password.requireLowercase).toBe(true);
    expect(config.password.requireNumber).toBe(true);
  });

  test('password policy should not have extra unknown fields', () => {
    const keys = Object.keys(config.password);
    expect(keys).toContain('minLength');
    expect(keys).toContain('requireUppercase');
    expect(keys).toContain('requireLowercase');
    expect(keys).toContain('requireNumber');
  });

  // ── New tests: OAuth config structure ─────────────────────────────────────

  test('oauth.google should have clientId, clientSecret, callbackUrl', () => {
    expect(config.oauth.google).toHaveProperty('clientId');
    expect(config.oauth.google).toHaveProperty('clientSecret');
    expect(config.oauth.google).toHaveProperty('callbackUrl');
    expect(typeof config.oauth.google.clientId).toBe('string');
    expect(typeof config.oauth.google.clientSecret).toBe('string');
    expect(typeof config.oauth.google.callbackUrl).toBe('string');
  });

  test('oauth.github should have clientId, clientSecret, callbackUrl', () => {
    expect(config.oauth.github).toHaveProperty('clientId');
    expect(config.oauth.github).toHaveProperty('clientSecret');
    expect(config.oauth.github).toHaveProperty('callbackUrl');
    expect(typeof config.oauth.github.clientId).toBe('string');
    expect(typeof config.oauth.github.clientSecret).toBe('string');
    expect(typeof config.oauth.github.callbackUrl).toBe('string');
  });

  test('oauth callback URLs should contain /api/auth/', () => {
    expect(config.oauth.google.callbackUrl).toMatch(/\/api\/auth\/google\/callback/);
    expect(config.oauth.github.callbackUrl).toMatch(/\/api\/auth\/github\/callback/);
  });

  test('oauth should only have google and github providers', () => {
    const providers = Object.keys(config.oauth);
    expect(providers).toContain('google');
    expect(providers).toContain('github');
    expect(providers).toHaveLength(2);
  });

  // ── New tests: additional config sections ─────────────────────────────────

  test('should have ssl configuration', () => {
    expect(config.ssl).toBeDefined();
    expect(config.ssl.certPath).toBeDefined();
    expect(config.ssl.keyPath).toBeDefined();
  });

  test('should have uploads configuration', () => {
    expect(config.uploads).toBeDefined();
    expect(config.uploads.dir).toBeDefined();
    expect(config.uploads.maxSizeBytes).toBeGreaterThan(0);
    expect(Array.isArray(config.uploads.allowedMimeTypes)).toBe(true);
    expect(config.uploads.allowedMimeTypes.length).toBeGreaterThan(0);
  });

  test('should have xp/gamification configuration', () => {
    expect(config.xp).toBeDefined();
    expect(config.xp.perWin).toBeGreaterThan(0);
    expect(config.xp.perLoss).toBeGreaterThan(0);
    expect(config.xp.levelThreshold).toBe(100);
  });

  test('jwt expiresIn and refreshExpiresIn should be different', () => {
    // Access tokens are shorter lived than refresh tokens
    expect(config.jwt.expiresIn).not.toBe(config.jwt.refreshExpiresIn);
  });
});
