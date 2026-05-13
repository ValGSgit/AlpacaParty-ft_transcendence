import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import AdminAuthService from '../../../src/services/adminAuthService.js';
import config from '../../../src/config/index.js';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../../src/config/index.js', () => {
  const mockConfig = {
    admin: {
      jwtSecret: 'test-secret-key',
      jwtExpiresIn: '7d',
    },
  };
  return {
    default: mockConfig,
  };
});

describe('AdminAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.sign.mockClear();
    mockJwt.verify.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateToken', () => {
    test('should generate a JWT token with admin data', () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      jwt.sign.mockReturnValue(mockToken);

      const admin = {
        id: 1,
        username: 'admin',
        role: 'admin',
      };

      const token = AdminAuthService.generateToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, username: 'admin', role: 'admin' },
        'test-secret-key',
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });

    test('should generate token with superadmin role', () => {
      const mockToken = 'token-superadmin';
      jwt.sign.mockReturnValue(mockToken);

      const superadmin = {
        id: 2,
        username: 'superadmin',
        role: 'superadmin',
      };

      const token = AdminAuthService.generateToken(superadmin);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 2, username: 'superadmin', role: 'superadmin' },
        'test-secret-key',
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });

    test('should include only required payload fields', () => {
      jwt.sign.mockReturnValue('token');

      const admin = {
        id: 1,
        username: 'admin',
        role: 'admin',
        email: 'admin@test.com',
        isBanned: false,
        createdAt: new Date(),
      };

      AdminAuthService.generateToken(admin);

      const payload = jwt.sign.mock.calls[0][0];
      expect(payload).toEqual({
        id: 1,
        username: 'admin',
        role: 'admin',
      });
      expect(payload.email).toBeUndefined();
      expect(payload.isBanned).toBeUndefined();
    });

    test('should use config JWT secret', () => {
      config.admin.jwtSecret = 'custom-secret-key';
      jwt.sign.mockReturnValue('token');

      const admin = { id: 1, username: 'admin', role: 'admin' };
      AdminAuthService.generateToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'custom-secret-key',
        expect.any(Object)
      );
    });

    test('should use config expiration time', () => {
      config.admin.jwtExpiresIn = '14d';
      jwt.sign.mockReturnValue('token');

      const admin = { id: 1, username: 'admin', role: 'admin' };
      AdminAuthService.generateToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '14d' }
      );
    });
  });

  describe('verifyToken', () => {
    test('should verify and return payload for valid token', () => {
      const payload = { id: 1, username: 'admin', role: 'admin' };
      jwt.verify.mockReturnValue(payload);

      const result = AdminAuthService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      expect(result).toEqual(payload);
    });

    test('should return null for expired token', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = AdminAuthService.verifyToken('expired-token');

      expect(result).toBeNull();
    });

    test('should return null for malformed token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('malformed token');
      });

      const result = AdminAuthService.verifyToken('malformed-token');

      expect(result).toBeNull();
    });

    test('should return null for invalid signature', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const result = AdminAuthService.verifyToken('tampered-token');

      expect(result).toBeNull();
    });

    test('should use config JWT secret for verification', () => {
      config.admin.jwtSecret = 'custom-secret';
      jwt.verify.mockReturnValue({ id: 1, username: 'admin' });

      AdminAuthService.verifyToken('token');

      expect(jwt.verify).toHaveBeenCalledWith('token', 'custom-secret');
    });

    test('should verify multiple tokens correctly', () => {
      const payload1 = { id: 1, username: 'admin1', role: 'admin' };
      const payload2 = { id: 2, username: 'admin2', role: 'superadmin' };
      jwt.verify
        .mockReturnValueOnce(payload1)
        .mockReturnValueOnce(payload2);

      const result1 = AdminAuthService.verifyToken('token1');
      const result2 = AdminAuthService.verifyToken('token2');

      expect(result1).toEqual(payload1);
      expect(result2).toEqual(payload2);
    });

    test('should handle empty token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('No token provided');
      });

      const result = AdminAuthService.verifyToken('');

      expect(result).toBeNull();
    });

    test('should handle null token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Token is null');
      });

      const result = AdminAuthService.verifyToken(null);

      expect(result).toBeNull();
    });
  });

  describe('integration tests', () => {
    test('should generate and verify a token in sequence', () => {
      const admin = { id: 1, username: 'admin', role: 'admin' };
      const mockToken = 'generated-and-verified-token';
      const mockPayload = { id: 1, username: 'admin', role: 'admin' };

      jwt.sign.mockReturnValue(mockToken);
      jwt.verify.mockReturnValue(mockPayload);

      const generatedToken = AdminAuthService.generateToken(admin);
      const verified = AdminAuthService.verifyToken(generatedToken);

      expect(verified).toEqual(mockPayload);
      expect(jwt.sign).toHaveBeenCalled();
      expect(jwt.verify).toHaveBeenCalled();
    });
  });
});
