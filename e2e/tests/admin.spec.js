import { test, expect } from '@playwright/test';
import { createUser, authHeaders } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const res = await request.post('/api/auth/login', {
    data: { username: email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.accessToken, user: body.user, refreshToken: body.refreshToken };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Admin Dashboard', () => {
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const admin = await loginAsSeeded(request, 'live_admin@alpacaparty.test');
    adminToken = admin.token;
  });

  test('admin login succeeds and can access admin endpoints', async ({ request }) => {
    const admin = await loginAsSeeded(request, 'live_admin@alpacaparty.test');
    expect(admin.token).toBeTruthy();

    // Verify the admin user can access a protected admin endpoint
    const statsRes = await request.get('/api/admin/stats', {
      headers: authHeaders(admin.token),
    });
    expect(statsRes.status()).toBe(200);
  });

  test('GET /api/admin/stats returns real statistics', async ({ request }) => {
    const res = await request.get('/api/admin/stats', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();

    const { stats, timestamp } = await res.json();
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.totalPosts).toBeGreaterThan(0);
    expect(typeof stats.onlineUsers).toBe('number');
    expect(typeof stats.totalGames).toBe('number');
    expect(typeof stats.totalMessages).toBe('number');
    expect(typeof stats.pendingRequests).toBe('number');
    expect(timestamp).toBeTruthy();
  });

  test('GET /api/admin/users returns paginated user list', async ({ request }) => {
    const res = await request.get('/api/admin/users?limit=10&offset=0', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.users)).toBeTruthy();
    expect(body.users.length).toBeGreaterThan(0);
    expect(body.users.length).toBeLessThanOrEqual(10);
    expect(body.total).toBeGreaterThan(0);
  });

  test('GET /api/admin/users supports pagination offset', async ({ request }) => {
    const page1 = await request.get('/api/admin/users?limit=5&offset=0', {
      headers: authHeaders(adminToken),
    });
    const page2 = await request.get('/api/admin/users?limit=5&offset=5', {
      headers: authHeaders(adminToken),
    });
    expect(page1.ok()).toBeTruthy();
    expect(page2.ok()).toBeTruthy();

    const body1 = await page1.json();
    const body2 = await page2.json();

    // Pages should have different users (assuming at least 6 users exist)
    if (body2.users.length > 0) {
      const ids1 = body1.users.map((u) => u.id);
      const ids2 = body2.users.map((u) => u.id);
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test('GET /api/admin/users?search= filters users', async ({ request }) => {
    const res = await request.get('/api/admin/users?search=live_admin', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.users.length).toBeGreaterThan(0);
    const found = body.users.some((u) => u.username === 'live_admin');
    expect(found).toBeTruthy();
  });

  test('toggle admin status grants and revokes admin access', async ({ request }) => {
    // Create a fresh non-admin user
    const testUser = await createUser(request, 'admin_toggle');
    const userToken = testUser.accessToken;

    // Verify the non-admin user cannot access admin endpoints initially
    const beforeToggleStats = await request.get('/api/admin/stats', {
      headers: authHeaders(userToken),
    });
    expect(beforeToggleStats.status()).toBe(403);

    // Toggle admin ON
    const toggleOn = await request.put(`/api/admin/users/${testUser.user.id}/toggle-admin`, {
      headers: authHeaders(adminToken),
    });
    expect(toggleOn.status()).toBe(200);

    // Verify the user can now access admin endpoints
    const afterToggleStats = await request.get('/api/admin/stats', {
      headers: authHeaders(userToken),
    });
    expect(afterToggleStats.status()).toBe(200);

    // Toggle admin OFF
    const toggleOff = await request.put(`/api/admin/users/${testUser.user.id}/toggle-admin`, {
      headers: authHeaders(adminToken),
    });
    expect(toggleOff.status()).toBe(200);

    // Verify the user cannot access admin endpoints again
    const afterToggleOffStats = await request.get('/api/admin/stats', {
      headers: authHeaders(userToken),
    });
    expect(afterToggleOffStats.status()).toBe(403);
  });

  test('non-admin user cannot access admin endpoints', async ({ request }) => {
    const regularUser = await createUser(request, 'noadmin');

    const statsRes = await request.get('/api/admin/stats', {
      headers: authHeaders(regularUser.accessToken),
    });
    expect(statsRes.status()).toBe(403);

    const usersRes = await request.get('/api/admin/users', {
      headers: authHeaders(regularUser.accessToken),
    });
    expect(usersRes.status()).toBe(403);
  });

  test('GET /api/admin/data-requests returns pending requests list', async ({ request }) => {
    const res = await request.get('/api/admin/data-requests', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.requests)).toBeTruthy();
  });
});
