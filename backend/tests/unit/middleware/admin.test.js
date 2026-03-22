import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const { requireAdmin } = await import('../../../src/middleware/admin.js');

function createReqRes(overrides = {}) {
  const req = { user: null, ...overrides };
  const res = {
    _status: 200,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

describe('requireAdmin middleware', () => {
  test('should reject with 403 when req.user is null', () => {
    const { req, res, next } = createReqRes({ user: null });
    requireAdmin(req, res, next);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: { message: 'Admin access required' } });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject with 403 when req.user is undefined', () => {
    const { req, res, next } = createReqRes({ user: undefined });
    requireAdmin(req, res, next);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: { message: 'Admin access required' } });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject with 403 when req.user.isAdmin is false', () => {
    const { req, res, next } = createReqRes({ user: { id: 1, isAdmin: false } });
    requireAdmin(req, res, next);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: { message: 'Admin access required' } });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject with 403 when req.user.isAdmin is missing', () => {
    const { req, res, next } = createReqRes({ user: { id: 1 } });
    requireAdmin(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next() when req.user.isAdmin is true', () => {
    const { req, res, next } = createReqRes({ user: { id: 1, isAdmin: true } });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._json).toBeNull();
  });

  test('should return 403 status code on rejection', () => {
    const { req, res, next } = createReqRes({ user: { id: 2, isAdmin: false } });
    const result = requireAdmin(req, res, next);
    expect(res._status).toBe(403);
  });
});
