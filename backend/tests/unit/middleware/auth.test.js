/**
 * Auth Middleware Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock database
const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

const { authenticate, optionalAuth } = await import('../../../src/middleware/auth.js');
const { default: AuthService } = await import('../../../src/services/authService.js');

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
    mockQuery.mockReset();
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
    const token = AuthService.generateAccessToken({ id: 999, username: 'ghost', is_admin: false });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.message).toBe('User not found');
  });

  test('should attach user to req and call next on success', async () => {
    const fakeUser = { id: 1, username: 'tester', email: 'test@test.com' };
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', is_admin: false });
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should call next(err) on unexpected error', async () => {
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', is_admin: false });
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const { req, res } = createReqRes({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('optionalAuth middleware', () => {
  beforeEach(() => {
    mockQuery.mockReset();
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
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', is_admin: false });
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

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
});
