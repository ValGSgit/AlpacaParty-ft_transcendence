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