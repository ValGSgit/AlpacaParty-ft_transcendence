/**
 * AuthService Unit Tests
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';

// Mock database (imported transitively by config)
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  default: { on: jest.fn(), query: jest.fn() },
}));

const { default: AuthService } = await import('../../../src/services/authService.js');
const { default: config } = await import('../../../src/config/index.js');

describe('AuthService', () => {
  describe('hashPassword / comparePassword', () => {
    test('should hash a password and verify it', async () => {
      const password = 'TestPass123';
      const hash = await AuthService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const match = await AuthService.comparePassword(password, hash);
      expect(match).toBe(true);
    });

    test('should reject wrong password', async () => {
      const hash = await AuthService.hashPassword('CorrectPass1');
      const match = await AuthService.comparePassword('WrongPass1', hash);
      expect(match).toBe(false);
    });
  });

  describe('generateAccessToken / verifyToken', () => {
    const fakeUser = { id: 1, username: 'tester', is_admin: false };

    test('should generate a valid access token', () => {
      const token = AuthService.generateAccessToken(fakeUser);
      expect(typeof token).toBe('string');

      const decoded = AuthService.verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(fakeUser.id);
      expect(decoded.username).toBe(fakeUser.username);
      expect(decoded.is_admin).toBe(false);
    });

    test('should reject invalid token', () => {
      const decoded = AuthService.verifyToken('invalid.token.string');
      expect(decoded).toBeNull();
    });

    test('should reject empty token', () => {
      expect(AuthService.verifyToken('')).toBeNull();
      expect(AuthService.verifyToken(null)).toBeNull();
      expect(AuthService.verifyToken(undefined)).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    const fakeUser = { id: 42, username: 'refresher' };

    test('should generate a refresh token with type=refresh', () => {
      const token = AuthService.generateRefreshToken(fakeUser);
      const decoded = AuthService.verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(42);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('validatePassword', () => {
    test('should accept a valid password', () => {
      const { valid, errors } = AuthService.validatePassword('ValidPass1');
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test('should reject password shorter than minLength', () => {
      const { valid, errors } = AuthService.validatePassword('Sh1');
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('at least'))).toBe(true);
    });

    test('should reject password without uppercase', () => {
      const { valid, errors } = AuthService.validatePassword('lowercase1');
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    test('should reject password without lowercase', () => {
      const { valid, errors } = AuthService.validatePassword('UPPERCASE1');
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    test('should reject password without number', () => {
      const { valid, errors } = AuthService.validatePassword('NoNumberHere');
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('number'))).toBe(true);
    });

    test('should reject empty/null password', () => {
      const r1 = AuthService.validatePassword('');
      expect(r1.valid).toBe(false);

      const r2 = AuthService.validatePassword(null);
      expect(r2.valid).toBe(false);

      const r3 = AuthService.validatePassword(undefined);
      expect(r3.valid).toBe(false);
    });

    test('should collect multiple errors', () => {
      const { valid, errors } = AuthService.validatePassword('ab');
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(1);
    });
  });
});
