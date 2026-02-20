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
});
