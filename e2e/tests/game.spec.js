import { test, expect } from '@playwright/test';
import { authHeaders, createUser, loginViaApi } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const body = await loginViaApi(request, email, password);
  return { token: body.accessToken, user: body.user };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Game Endpoints', () => {
  let demoToken;

  test.beforeAll(async ({ request }) => {
    const demo = await loginAsSeeded(request, 'live_demo@alpacaparty.test');
    demoToken = demo.token;
  });

  test('GET /api/game/stats returns game statistics', async ({ request }) => {
    const res = await request.get('/api/game/stats', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // Stats should contain some game-related data
    expect(body).toBeTruthy();
    expect(typeof body === 'object').toBeTruthy();
  });

  test('GET /api/game/leaderboard returns leaderboard', async ({ request }) => {
    const res = await request.get('/api/game/leaderboard', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const entries = body.leaderboard ?? body.entries ?? body;
    expect(Array.isArray(entries)).toBeTruthy();
  });

  test('GET /api/game/achievements returns achievements list', async ({ request }) => {
    const res = await request.get('/api/game/achievements', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const achievements = body.achievements ?? body;
    expect(Array.isArray(achievements)).toBeTruthy();
  });

  test('GET /api/game/farm returns farm data', async ({ request }) => {
    const res = await request.get('/api/game/farm', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toBeTruthy();
    // Farm should return some data structure (farm object, alpacas, etc.)
    expect(typeof body === 'object').toBeTruthy();
  });

  test('GET /api/game/history returns game history', async ({ request }) => {
    const res = await request.get('/api/game/history', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const history = body.history ?? body.games ?? body;
    expect(Array.isArray(history)).toBeTruthy();
  });

  test('GET /api/game/challenges returns challenges', async ({ request }) => {
    const res = await request.get('/api/game/challenges', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const challenges = body.challenges ?? body;
    expect(Array.isArray(challenges)).toBeTruthy();
  });

  test('PUT /api/game/farm saves farm state', async ({ request }) => {
    // First get existing farm to know its shape
    const getRes = await request.get('/api/game/farm', {
      headers: authHeaders(demoToken),
    });
    expect(getRes.ok()).toBeTruthy();
    const farmData = await getRes.json();

    // Save farm (send back the same data to avoid corruption)
    const farm = farmData.farm ?? farmData;
    const saveRes = await request.put('/api/game/farm', {
      headers: authHeaders(demoToken),
      data: { farm },
    });
    expect(saveRes.ok()).toBeTruthy();
  });

  test('unauthenticated request to game endpoints fails', async ({ request }) => {
    const res = await request.get('/api/game/stats');
    expect(res.status()).toBe(401);
  });

  test('farm data roundtrip persists specific values', async ({ request }) => {
    const user = await createUser(request, 'farm_roundtrip');

    const payload = { coins: 999, alpacas: ['fluffy', 'spark'], items: ['hat'], upgrades: 3, herdsize: 2 };
    const saveRes = await request.put('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
      data: payload,
    });
    expect(saveRes.ok()).toBeTruthy();

    const getRes = await request.get('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
    });
    expect(getRes.ok()).toBeTruthy();

    const body = await getRes.json();
    const farm = body.farmData ?? body.farm ?? body;
    expect(farm.coins).toBe(999);
    expect(farm.upgrades).toBe(3);
    expect(farm.herdsize).toBe(2);
  });

  test('GET /api/game/stats accepts gameType query param', async ({ request }) => {
    const res = await request.get('/api/game/stats?gameType=spit_royale', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();
    expect(typeof (await res.json())).toBe('object');
  });
});
