/**
 * Error Handler Middleware Unit Tests
 */
import { describe, test, expect } from '@jest/globals';
import { notFoundHandler, errorHandler } from '../../../src/middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  describe('notFoundHandler', () => {
    test('should create a 404 error and call next', () => {
      const next = (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Not Found');
        expect(err.status).toBe(404);
      };
      notFoundHandler({}, {}, next);
    });
  });

  describe('errorHandler', () => {
    function createRes() {
      const res = {
        _status: null,
        _json: null,
        status(code) { res._status = code; return res; },
        json(body) { res._json = body; return res; },
      };
      return res;
    }

    test('should return error status and message', () => {
      const err = new Error('Something went wrong');
      err.status = 400;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(400);
      expect(res._json.error.message).toBe('Something went wrong');
    });

    test('should default to 500 if no status set', () => {
      const err = new Error('Unexpected');
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(500);
    });

    test('should include stack trace in development', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const err = new Error('Dev error');
      err.status = 500;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._json.error.stack).toBeDefined();
      process.env.NODE_ENV = origEnv;
    });

    test('should NOT include stack in production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new Error('Prod error');
      err.status = 500;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._json.error.stack).toBeUndefined();
      process.env.NODE_ENV = origEnv;
    });

    test('should use default message when err.message is empty', () => {
      const err = new Error();
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(500);
    });

    test('should preserve 422 status code', () => {
      const err = new Error('Unprocessable Entity');
      err.status = 422;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(422);
      expect(res._json.error.message).toBe('Unprocessable Entity');
    });

    test('should preserve 403 status code', () => {
      const err = new Error('Forbidden');
      err.status = 403;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(403);
    });

    test('should return 500 and default message for plain thrown string', () => {
      const err = { message: '', status: undefined };
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(500);
      expect(res._json.error.message).toBe('Internal Server Error');
    });

    test('notFoundHandler sets err.status=404 with message Not Found', () => {
      let captured;
      notFoundHandler({}, {}, (err) => { captured = err; });
      expect(captured.status).toBe(404);
      expect(captured.message).toBe('Not Found');
    });

    // ── New tests ───────────────────────────────────────────────────────────

    test('should preserve 429 rate limit status code', () => {
      const err = new Error('Too Many Requests');
      err.status = 429;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(429);
      expect(res._json.error.message).toBe('Too Many Requests');
    });

    test('should preserve 503 service unavailable status code', () => {
      const err = new Error('Service Unavailable');
      err.status = 503;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(503);
      expect(res._json.error.message).toBe('Service Unavailable');
    });

    test('should preserve 409 conflict status code', () => {
      const err = new Error('Conflict');
      err.status = 409;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(409);
      expect(res._json.error.message).toBe('Conflict');
    });

    test('should handle error with both message and status correctly', () => {
      const err = new Error('Custom error with status');
      err.status = 418; // I'm a teapot
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(418);
      expect(res._json.error.message).toBe('Custom error with status');
    });

    test('should use message from error even when status defaults to 500', () => {
      const err = new Error('Specific error without status');
      // No err.status set, should default to 500
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(500);
      expect(res._json.error.message).toBe('Specific error without status');
    });

    test('should handle error object with status=0 as 500', () => {
      const err = { message: 'Zero status', status: 0 };
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      // 0 is falsy, so it falls back to 500
      expect(res._status).toBe(500);
      expect(res._json.error.message).toBe('Zero status');
    });

    test('should handle 401 unauthorized status', () => {
      const err = new Error('Unauthorized');
      err.status = 401;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._status).toBe(401);
      expect(res._json.error.message).toBe('Unauthorized');
    });

    test('should NOT include stack in test environment', () => {
      // NODE_ENV is 'test' during tests, not 'development'
      const err = new Error('Test error');
      err.status = 500;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._json.error.stack).toBeUndefined();
    });

    test('error response should have correct structure', () => {
      const err = new Error('Structured error');
      err.status = 400;
      const res = createRes();

      errorHandler(err, {}, res, () => {});

      expect(res._json).toHaveProperty('error');
      expect(res._json.error).toHaveProperty('message');
      expect(typeof res._json.error.message).toBe('string');
    });
  });
});
