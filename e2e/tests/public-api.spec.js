import { test, expect } from '@playwright/test';

const API_KEY = process.env.E2E_API_KEY || 'test-api-key';

function apiKeyHeaders(key = API_KEY) {
  return { 'X-API-Key': key };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Public API Showcase', () => {
  test('GET /api/public returns endpoint documentation', async ({ request }) => {
    const res = await request.get('/api/public', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.name).toBe('AlpacaParty Public API');
    expect(body.version).toBeTruthy();
    expect(Array.isArray(body.endpoints)).toBeTruthy();
    expect(body.endpoints.length).toBeGreaterThan(0);
  });

  test('missing API key returns 401', async ({ request }) => {
    const res = await request.get('/api/public/users');
    expect(res.status()).toBe(401);
  });

  test('invalid API key returns 401', async ({ request }) => {
    const res = await request.get('/api/public/users', {
      headers: { 'X-API-Key': 'invalid-key-12345' },
    });
    expect(res.status()).toBe(401);
  });

});
