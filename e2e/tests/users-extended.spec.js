import { test, expect } from '@playwright/test';
import { authHeaders, createUser } from './helpers/api.js';

// ── Users List & Lookup ────────────────────────────────────────────────────────

test.describe('Users List & Lookup', () => {
  let userA;

  test.beforeAll(async ({ request }) => {
    userA = await createUser(request, 'usrlist');
  });

  test('GET /users returns paginated list with total count', async ({ request }) => {
    const res = await request.get('/api/users?limit=5&offset=0', {
      headers: authHeaders(userA.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.users)).toBeTruthy();
    expect(typeof body.total).toBe('number');
    expect(body.total).toBeGreaterThan(0);
    expect(body.users.length).toBeLessThanOrEqual(5);
  });

  test('GET /users respects limit', async ({ request }) => {
    const res = await request.get('/api/users?limit=2', {
      headers: authHeaders(userA.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.users.length).toBeLessThanOrEqual(2);
  });

  test('GET /users?search= finds the current user by username', async ({ request }) => {
    const res = await request.get(`/api/users?search=${userA.username}`, {
      headers: authHeaders(userA.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const found = body.users.some((u) => u.username === userA.username);
    expect(found).toBeTruthy();
  });

  test('GET /users/:id returns the user profile', async ({ request }) => {
    const res = await request.get(`/api/users/${userA.user.id}`, {
      headers: authHeaders(userA.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.user.id).toBe(userA.user.id);
    expect(body.user.username).toBe(userA.username);
  });

  test('GET /users/:id for a nonexistent user returns 404', async ({ request }) => {
    const res = await request.get('/api/users/999999999', {
      headers: authHeaders(userA.accessToken),
    });
    expect(res.status()).toBe(404);
  });

  test('GET /users without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/users');
    expect(res.status()).toBe(401);
  });

  test('GET /users/:id without auth returns 401', async ({ request }) => {
    const res = await request.get(`/api/users/${userA.user.id}`);
    expect(res.status()).toBe(401);
  });
});

// ── Farm Data via /users/me ────────────────────────────────────────────────────

test.describe('Farm Data (/users/me/farmdata)', () => {
  let user;

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'farmdata_user');
  });

  test('GET /users/me/farmdata on a new user returns null farmData', async ({ request }) => {
    const res = await request.get('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect('farmData' in body).toBeTruthy();
    // New user has no farm yet
    expect(body.farmData).toBeNull();
  });

  test('PUT /users/me/farmdata saves and returns the farm state', async ({ request }) => {
    const payload = {
      alpacas: [{ id: 'a1', name: 'Fluffy', color: 'white' }],
      items: [{ id: 'fence1', type: 'fence' }],
      coins: 250,
      upgrades: 2,
      herdsize: 1,
    };

    const res = await request.put('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
      data: payload,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.farmData.coins).toBe(250);
    expect(body.farmData.upgrades).toBe(2);
    expect(body.farmData.herdsize).toBe(1);
  });

  test('GET /users/me/farmdata returns the saved state after a PUT', async ({ request }) => {
    const res = await request.get('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.farmData).not.toBeNull();
    expect(body.farmData.coins).toBe(250);
  });

  test('PUT /users/me/farmdata with empty body uses default values', async ({ request }) => {
    const freshUser = await createUser(request, 'farmdata_defaults');
    const res = await request.put('/api/users/me/farmdata', {
      headers: authHeaders(freshUser.accessToken),
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.farmData.coins).toBe(10);
    expect(body.farmData.upgrades).toBe(0);
    expect(body.farmData.herdsize).toBe(0);
  });

  test('PUT /users/me/farmdata overwrites previous state', async ({ request }) => {
    await request.put('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
      data: { coins: 500, upgrades: 5, herdsize: 3 },
    });

    const res = await request.get('/api/users/me/farmdata', {
      headers: authHeaders(user.accessToken),
    });
    const body = await res.json();
    expect(body.farmData.coins).toBe(500);
    expect(body.farmData.upgrades).toBe(5);
  });

  test('GET /users/me/farmdata without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/users/me/farmdata');
    expect(res.status()).toBe(401);
  });

  test('PUT /users/me/farmdata without auth returns 401', async ({ request }) => {
    const res = await request.put('/api/users/me/farmdata', {
      data: { coins: 100 },
    });
    expect(res.status()).toBe(401);
  });
});
