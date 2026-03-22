/**
 * Auth Middleware Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock User model (auth middleware calls User.findById)
const mockUserFindById = jest.fn();
jest.unstable_mockModule('../../../src/models/User.js', () => ({
  default: { findById: mockUserFindById },
  shapeUserForClient: jest.fn((u) => u),
}));

const { authenticate, optionalAuth } = await import('../../../src/middleware/auth.js');
const { default: AuthService } = await import('../../../src/services/authService.js');
const { default: config } = await import('../../../src/config/index.js');

function createReqRes(headers = {}) {
  const req = { headers, user: null };
  const res = {
    _status: null,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res };
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    mockUserFindById.mockReset();
  });

  test('should reject request without Authorization header', async () => {
    const { req, res } = createReqRes({});
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject request with malformed Authorization header', async () => {
    const { req, res } = createReqRes({ authorization: 'Basic abc123' });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('Authentication required');
  });

  test('should reject request with invalid token', async () => {
    const { req, res } = createReqRes({ authorization: 'Bearer invalid.token' });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('Invalid or expired token');
  });

  test('should reject refresh tokens', async () => {
    const refreshToken = AuthService.generateRefreshToken({ id: 1 });
    const { req, res } = createReqRes({ authorization: `Bearer ${refreshToken}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('Invalid or expired token');
  });

  test('should reject if user not found in DB', async () => {
    const token = AuthService.generateAccessToken({ id: 999, username: 'ghost', isAdmin: false });
    mockUserFindById.mockResolvedValueOnce(null);

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('User not found');
  });

  test('should attach user to req and call next on success', async () => {
    const fakeUser = { id: 1, username: 'tester', email: 'test@test.com' };
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', isAdmin: false });
    mockUserFindById.mockResolvedValueOnce(fakeUser);

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should call next(err) on unexpected error', async () => {
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', isAdmin: false });
    mockUserFindById.mockRejectedValueOnce(new Error('DB down'));

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should attach admin user and call next', async () => {
    const adminUser = { id: 2, username: 'admin', email: 'admin@test.com', isAdmin: true };
    const token = AuthService.generateAccessToken({ id: 2, username: 'admin', isAdmin: true });
    mockUserFindById.mockResolvedValueOnce(adminUser);

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toEqual(adminUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should reject token with lowercase bearer scheme', async () => {
    const token = AuthService.generateAccessToken({ id: 1, username: 'u', is_admin: false });
    const { req, res } = createReqRes({ authorization: `bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── New tests ─────────────────────────────────────────────────────────────

  test('should reject expired token', async () => {
    // Create a token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { id: 1, username: 'tester', isAdmin: false },
      config.jwt.secret,
      { expiresIn: '-1h' },
    );
    const { req, res } = createReqRes({ authorization: `Bearer ${expiredToken}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject token missing id field', async () => {
    // Token with no id in payload
    const tokenNoId = jwt.sign(
      { username: 'tester', isAdmin: false },
      config.jwt.secret,
      { expiresIn: '1h' },
    );
    const { req, res } = createReqRes({ authorization: `Bearer ${tokenNoId}` });
    const next = jest.fn();

    // Token is valid JWT but findById(undefined) will return null user
    mockUserFindById.mockResolvedValueOnce(null);

    await authenticate(req, res, next);

    // Should fail at either verifyToken or user-not-found stage
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('concurrent requests should not interfere with each other', async () => {
    const user1 = { id: 1, username: 'user1', email: 'u1@test.com' };
    const user2 = { id: 2, username: 'user2', email: 'u2@test.com' };
    const token1 = AuthService.generateAccessToken({ id: 1, username: 'user1', isAdmin: false });
    const token2 = AuthService.generateAccessToken({ id: 2, username: 'user2', isAdmin: false });

    mockUserFindById
      .mockResolvedValueOnce(user1)
      .mockResolvedValueOnce(user2);

    const { req: req1, res: res1 } = createReqRes({ authorization: `Bearer ${token1}` });
    const { req: req2, res: res2 } = createReqRes({ authorization: `Bearer ${token2}` });
    const next1 = jest.fn();
    const next2 = jest.fn();

    // Run both in parallel
    await Promise.all([
      authenticate(req1, res1, next1),
      authenticate(req2, res2, next2),
    ]);

    expect(req1.user).toEqual(user1);
    expect(req2.user).toEqual(user2);
    expect(next1).toHaveBeenCalledTimes(1);
    expect(next2).toHaveBeenCalledTimes(1);
  });

  test('should reject token with empty string after Bearer', async () => {
    const { req, res } = createReqRes({ authorization: 'Bearer ' });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuth middleware', () => {
  beforeEach(() => {
    mockUserFindById.mockReset();
  });

  test('should call next without user when no header', async () => {
    const { req, res } = createReqRes({});
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should attach user when valid token is present', async () => {
    const fakeUser = { id: 1, username: 'tester' };
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', isAdmin: false });
    mockUserFindById.mockResolvedValueOnce(fakeUser);

    const req = { headers: { authorization: `Bearer ${token}` }, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });

  test('should proceed without user when token is invalid', async () => {
    const req = { headers: { authorization: 'Bearer invalid' }, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    expect(next).toHaveBeenCalled();
  });

  test('should ignore refresh tokens', async () => {
    const token = AuthService.generateRefreshToken({ id: 1 });
    const req = { headers: { authorization: `Bearer ${token}` }, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test('should proceed without user when DB throws in optionalAuth', async () => {
    const token = AuthService.generateAccessToken({ id: 1, username: 'u', isAdmin: false });
    mockUserFindById.mockRejectedValueOnce(new Error('DB failure'));

    const req = { headers: { authorization: `Bearer ${token}` }, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    expect(next).toHaveBeenCalled();
  });

  test('should not set req.user when bearer token is missing', async () => {
    const req = { headers: {}, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── New tests ─────────────────────────────────────────────────────────────

  test('should proceed without user when token is expired', async () => {
    const expiredToken = jwt.sign(
      { id: 1, username: 'tester', isAdmin: false },
      config.jwt.secret,
      { expiresIn: '-1h' },
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` }, user: null };
    const next = jest.fn();

    await optionalAuth(req, {}, next);

    // Expired tokens are silently ignored in optionalAuth
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('concurrent optionalAuth calls should not interfere', async () => {
    const user1 = { id: 1, username: 'user1' };
    const token1 = AuthService.generateAccessToken({ id: 1, username: 'user1', isAdmin: false });

    mockUserFindById.mockResolvedValueOnce(user1);

    const req1 = { headers: { authorization: `Bearer ${token1}` }, user: null };
    const req2 = { headers: {}, user: null }; // no token
    const next1 = jest.fn();
    const next2 = jest.fn();

    await Promise.all([
      optionalAuth(req1, {}, next1),
      optionalAuth(req2, {}, next2),
    ]);

    expect(req1.user).toEqual(user1);
    expect(req2.user).toBeNull();
    expect(next1).toHaveBeenCalledTimes(1);
    expect(next2).toHaveBeenCalledTimes(1);
  });
});
