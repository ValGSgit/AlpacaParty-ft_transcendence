/**
 * API Key Middleware Unit Tests
 *
 * config.apiKeys is a getter that reads process.env.API_KEYS on each access,
 * so tests just set the env var before calling the middleware.
 */
import { jest, describe, test, expect, afterAll } from '@jest/globals';
import { requireApiKey } from '../../../src/middleware/apiKey.js';

const originalApiKeys = process.env.API_KEYS;
afterAll(() => { process.env.API_KEYS = originalApiKeys; });

function setKeys(keys) { process.env.API_KEYS = keys; }

function mockRes() {
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('requireApiKey', () => {
  test('rejects request with no API key header', async () => {
    setKeys('valid-key-123');
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with wrong API key', async () => {
    setKeys('correct-key');
    const req = { headers: { 'x-api-key': 'wrong-key' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() with valid API key', async () => {
    setKeys('my-valid-key');
    const req = { headers: { 'x-api-key': 'my-valid-key' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('supports multiple API keys (comma-separated)', async () => {
    setKeys('key-one,key-two,key-three');
    const next = jest.fn();
    for (const key of ['key-one', 'key-two', 'key-three']) {
      const req = { headers: { 'x-api-key': key } };
      await requireApiKey(req, mockRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  test('rejects empty key even if API_KEYS is set', async () => {
    setKeys('real-key');
    const req = { headers: { 'x-api-key': '' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  test('trims whitespace from configured keys', async () => {
    setKeys('  spaced-key  , another-key ');
    const req = { headers: { 'x-api-key': 'spaced-key' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('does not trim whitespace from incoming request key', async () => {
    setKeys('exact-key');
    const req = { headers: { 'x-api-key': '  exact-key  ' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('keys are case-sensitive', async () => {
    setKeys('CaseSensitive-Key');
    const req = { headers: { 'x-api-key': 'casesensitive-key' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('exact case match succeeds', async () => {
    setKeys('CaseSensitive-Key');
    const req = { headers: { 'x-api-key': 'CaseSensitive-Key' } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('rejects undefined API key header', async () => {
    setKeys('valid-key');
    const req = { headers: { 'x-api-key': undefined } };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns proper error body on rejection', async () => {
    setKeys('valid-key');
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.body).toBeDefined();
    expect(res.body.error.message).toMatch(/invalid|missing/i);
  });

  test('handles comma-separated keys with empty entries', async () => {
    setKeys('key1,,key2');
    const next = jest.fn();

    const req1 = { headers: { 'x-api-key': '' } };
    await requireApiKey(req1, mockRes(), next);
    expect(next).not.toHaveBeenCalled();

    const req2 = { headers: { 'x-api-key': 'key1' } };
    await requireApiKey(req2, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const req3 = { headers: { 'x-api-key': 'key2' } };
    await requireApiKey(req3, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
