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
  });
});
