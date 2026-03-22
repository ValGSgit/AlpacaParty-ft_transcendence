/**
 * API Key Middleware Unit Tests
 */
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

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

  // ── New tests ─────────────────────────────────────────────────────────────

  test('trims whitespace from configured keys', async () => {
    // The middleware trims keys via .map(k => k.trim())
    const requireApiKey = await loadMiddleware('  spaced-key  , another-key ');
    const req = { headers: { 'x-api-key': 'spaced-key' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('does not trim whitespace from incoming request key', async () => {
    // The middleware checks req.headers['x-api-key'] directly
    const requireApiKey = await loadMiddleware('exact-key');
    const req = { headers: { 'x-api-key': '  exact-key  ' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    // The incoming key has extra spaces, so it should NOT match
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('keys are case-sensitive', async () => {
    const requireApiKey = await loadMiddleware('CaseSensitive-Key');
    const req = { headers: { 'x-api-key': 'casesensitive-key' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('exact case match succeeds', async () => {
    const requireApiKey = await loadMiddleware('CaseSensitive-Key');
    const req = { headers: { 'x-api-key': 'CaseSensitive-Key' } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('rejects undefined API key header', async () => {
    const requireApiKey = await loadMiddleware('valid-key');
    const req = { headers: { 'x-api-key': undefined } };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns proper error body on rejection', async () => {
    const requireApiKey = await loadMiddleware('valid-key');
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res.body).toBeDefined();
    expect(res.body.error.message).toMatch(/invalid|missing/i);
  });

  test('handles comma-separated keys with empty entries', async () => {
    // e.g. "key1,,key2" — empty strings are filtered by .filter(Boolean)
    const requireApiKey = await loadMiddleware('key1,,key2');
    const next = jest.fn();

    // empty string should not be a valid key
    const req1 = { headers: { 'x-api-key': '' } };
    requireApiKey(req1, mockRes(), next);
    expect(next).not.toHaveBeenCalled();

    // key1 should still work
    const req2 = { headers: { 'x-api-key': 'key1' } };
    requireApiKey(req2, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    // key2 should still work
    const req3 = { headers: { 'x-api-key': 'key2' } };
    requireApiKey(req3, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
