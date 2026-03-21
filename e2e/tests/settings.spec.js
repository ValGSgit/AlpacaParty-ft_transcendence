import { test, expect } from '@playwright/test';
import { authHeaders, createUser, uniqueId } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const res = await request.post('/api/auth/login', {
    data: { username: email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.accessToken, user: body.user };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('User Settings', () => {
  let demoToken;

  test.beforeAll(async ({ request }) => {
    const demo = await loginAsSeeded(request, 'live_demo@alpacaparty.test');
    demoToken = demo.token;
  });

  test('update bio', async ({ request }) => {
    const newBio = `E2E bio update ${uniqueId('bio')}`;

    const res = await request.put('/api/users/me', {
      headers: authHeaders(demoToken),
      data: { bio: newBio },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.user.bio).toBe(newBio);
  });

  test('update status', async ({ request }) => {
    const newStatus = `Testing ${uniqueId('status')}`;

    const res = await request.put('/api/users/me', {
      headers: authHeaders(demoToken),
      data: { status: newStatus },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.user.status).toBe(newStatus);
  });

  test('update username (on fresh user to avoid conflicts)', async ({ request }) => {
    const user = await createUser(request, 'rename');
    const newUsername = uniqueId('renamed');

    const res = await request.put('/api/users/me', {
      headers: authHeaders(user.accessToken),
      data: { username: newUsername },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.user.username).toBe(newUsername);

    // Verify new username works for login
    const loginRes = await request.post('/api/auth/login', {
      data: { username: newUsername, password: user.password },
    });
    expect(loginRes.ok()).toBeTruthy();
  });

  test('bio validation rejects over 500 characters', async ({ request }) => {
    const longBio = 'x'.repeat(501);

    const res = await request.put('/api/users/me', {
      headers: authHeaders(demoToken),
      data: { bio: longBio },
    });
    expect(res.status()).toBe(400);
  });

  test('status validation rejects over 200 characters', async ({ request }) => {
    const longStatus = 'x'.repeat(201);

    const res = await request.put('/api/users/me', {
      headers: authHeaders(demoToken),
      data: { status: longStatus },
    });
    expect(res.status()).toBe(400);
  });

  test('duplicate username is rejected', async ({ request }) => {
    const existingUser = await createUser(request, 'existing');
    const otherUser = await createUser(request, 'wannabe');

    const res = await request.put('/api/users/me', {
      headers: authHeaders(otherUser.accessToken),
      data: { username: existingUser.username },
    });
    expect(res.status()).toBe(409);
  });

  test('export data in JSON format', async ({ request }) => {
    const res = await request.get('/api/users/me/export?format=json', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('json');

    const disposition = res.headers()['content-disposition'];
    expect(disposition).toContain('alpacaparty-data');

    // Should be valid JSON
    const body = await res.json();
    expect(body).toBeTruthy();
    expect(typeof body === 'object').toBeTruthy();
  });

  test('export data in CSV format', async ({ request }) => {
    const res = await request.get('/api/users/me/export?format=csv', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('csv');
  });

  test('request account deletion creates pending request', async ({ request }) => {
    // Use a fresh user to avoid conflicts with live_demo
    const user = await createUser(request, 'delreq');

    const res = await request.post('/api/users/me/delete-request', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.request).toBeTruthy();
    expect(body.request.type).toBe('delete');
    expect(body.request.status).toBe('pending');

    // Verify the pending request exists in data-requests list
    const listRes = await request.get('/api/users/me/data-requests', {
      headers: authHeaders(user.accessToken),
    });
    expect(listRes.ok()).toBeTruthy();

    const listBody = await listRes.json();
    expect(Array.isArray(listBody.requests)).toBeTruthy();
    const pending = listBody.requests.find(
      (r) => r.type === 'delete' && r.status === 'pending',
    );
    expect(pending).toBeTruthy();
  });

  test('duplicate deletion request is rejected', async ({ request }) => {
    const user = await createUser(request, 'dupdelreq');

    // First request
    const first = await request.post('/api/users/me/delete-request', {
      headers: authHeaders(user.accessToken),
    });
    expect(first.status()).toBe(201);

    // Second request should be rejected
    const second = await request.post('/api/users/me/delete-request', {
      headers: authHeaders(user.accessToken),
    });
    expect(second.status()).toBe(409);
  });

  test('GET /api/users/me returns current user profile', async ({ request }) => {
    const res = await request.get('/api/users/me', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.user).toBeTruthy();
    expect(body.user.username).toBe('live_demo');
    expect(body.user.id).toBeTruthy();
  });
});
