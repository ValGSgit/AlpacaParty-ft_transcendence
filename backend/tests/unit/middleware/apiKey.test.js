/**
 * API Key Middleware Unit Tests
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Helper to load the module fresh with custom env
async function loadMiddleware(apiKeys) {
  const original = process.env.API_KEYS;
  process.env.API_KEYS = apiKeys;

  // Force re-import by clearing module cache equivalent
  const mod = await import('../../../src/middleware/apiKey.js?' + Math.random());
  process.env.API_KEYS = original;
  return mod.requireApiKey;
}

function mockRes() {
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('requireApiKey', () => {
  test('rejects request with no API key header', async () => {
    const requireApiKey = await loadMiddleware('valid-key-123');
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with wrong API key', async () => {
    const requireApiKey = await loadMiddleware('correct-key');
    const req = { headers: { 'x-api-key': 'wrong-key' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() with valid API key', async () => {
    const requireApiKey = await loadMiddleware('my-valid-key');
    const req = { headers: { 'x-api-key': 'my-valid-key' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('supports multiple API keys (comma-separated)', async () => {
    const requireApiKey = await loadMiddleware('key-one,key-two,key-three');
    const next = jest.fn();
    for (const key of ['key-one', 'key-two', 'key-three']) {
      const req = { headers: { 'x-api-key': key } };
      requireApiKey(req, mockRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  test('rejects empty key even if API_KEYS is set', async () => {
    const requireApiKey = await loadMiddleware('real-key');
    const req = { headers: { 'x-api-key': '' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
  });
});
