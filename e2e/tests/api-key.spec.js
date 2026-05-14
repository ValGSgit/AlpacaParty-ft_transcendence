import { test, expect } from '@playwright/test';
import { authHeaders, createUser, uniqueId } from './helpers/api.js';

function apiKeyHeaders(key) {
  return { 'X-API-Key': key };
}

// ── API Key Management ─────────────────────────────────────────────────────────

test.describe('API Key Management', () => {
  let user;

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'apikey_user');
  });

  test('GET /users/me/api-key returns 404 before any key is generated', async ({ request }) => {
    const res = await request.get('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.status()).toBe(404);
  });

  test('POST /users/me/api-key generates and returns a key', async ({ request }) => {
    const res = await request.post('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.apiKey).toBe('string');
    expect(body.apiKey.length).toBeGreaterThan(10);
  });

  test('GET /users/me/api-key returns the key after it has been generated', async ({ request }) => {
    const res = await request.get('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.apiKey).toBe('string');
  });

  test('DELETE /users/me/api-key revokes the key and subsequent GET returns 404', async ({ request }) => {
    // Ensure key exists
    await request.post('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });

    const del = await request.delete('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(del.ok()).toBeTruthy();
    const delBody = await del.json();
    expect(delBody.message).toBeTruthy();

    const get = await request.get('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(get.status()).toBe(404);
  });

  test('unauthenticated request to /users/me/api-key is rejected', async ({ request }) => {
    const res = await request.get('/api/users/me/api-key');
    expect(res.status()).toBe(401);
  });
});

// ── Public API (authenticated via API key) ─────────────────────────────────────

test.describe('Public API endpoints', () => {
  let user;
  let apiKey;

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'pubapi_user');
    const res = await request.post('/api/users/me/api-key', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.status()).toBe(201);
    apiKey = (await res.json()).apiKey;
  });

  test('GET /public/users returns an array', async ({ request }) => {
    const res = await request.get('/api/public/users', {
      headers: apiKeyHeaders(apiKey),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.users)).toBeTruthy();
  });

  test('GET /public/users supports limit and offset pagination', async ({ request }) => {
    const page1 = await request.get('/api/public/users?limit=2&offset=0', {
      headers: apiKeyHeaders(apiKey),
    });
    expect(page1.ok()).toBeTruthy();
    const body = await page1.json();
    expect(body.users.length).toBeLessThanOrEqual(2);
  });

  test('GET /public/users/:id returns 404 for nonexistent user', async ({ request }) => {
    const res = await request.get('/api/public/users/999999999', {
      headers: apiKeyHeaders(apiKey),
    });
    expect(res.status()).toBe(404);
  });

  test('GET /public/posts returns public posts array', async ({ request }) => {
    const res = await request.get('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.posts)).toBeTruthy();
  });

  test('POST /public/posts creates a post for the key owner', async ({ request }) => {
    const content = `Public API post ${uniqueId('pubpost')}`;
    const res = await request.post('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
      data: { content },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.post.content).toBe(content);
    expect(body.post.id).toBeTruthy();
  });

  test('PUT /public/posts/:id updates own post', async ({ request }) => {
    const createRes = await request.post('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
      data: { content: `Editable pub post ${uniqueId('pubedit')}` },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const updated = `Updated ${uniqueId('pubupd')}`;
    const putRes = await request.put(`/api/public/posts/${post.id}`, {
      headers: apiKeyHeaders(apiKey),
      data: { content: updated },
    });
    expect(putRes.ok()).toBeTruthy();
    const putBody = await putRes.json();
    expect(putBody.post.content).toBe(updated);
  });

  test('DELETE /public/posts/:id deletes own post', async ({ request }) => {
    const createRes = await request.post('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
      data: { content: `Deletable pub post ${uniqueId('pubdel')}` },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const delRes = await request.delete(`/api/public/posts/${post.id}`, {
      headers: apiKeyHeaders(apiKey),
    });
    expect(delRes.ok()).toBeTruthy();
    const delBody = await delRes.json();
    expect(delBody.message).toBeTruthy();
  });

  test('PUT /public/posts/:id on another user post returns 400', async ({ request, playwright }) => {
    // Register the other user in an isolated context so their jwt_token cookie
    // does not bleed into `request`'s cookie jar and trigger the session check.
    const otherCtx = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'https://localhost:8443',
      ignoreHTTPSErrors: true,
    });
    const other = await createUser(otherCtx, 'pubapi_other');
    const keyRes = await otherCtx.post('/api/users/me/api-key', {
      headers: authHeaders(other.accessToken),
    });
    const otherKey = (await keyRes.json()).apiKey;
    await otherCtx.dispose();

    const createRes = await request.post('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
      data: { content: 'Owned by first user' },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const putRes = await request.put(`/api/public/posts/${post.id}`, {
      headers: apiKeyHeaders(otherKey),
      data: { content: 'Hijacked!' },
    });
    expect(putRes.status()).toBe(400);
  });

  test('DELETE /public/posts/:id on another user post returns 400', async ({ request, playwright }) => {
    // Same isolation: register the other user in a separate context so their
    // cookie doesn't contaminate the main request context.
    const otherCtx = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'https://localhost:8443',
      ignoreHTTPSErrors: true,
    });
    const other = await createUser(otherCtx, 'pubapi_other2');
    const keyRes = await otherCtx.post('/api/users/me/api-key', {
      headers: authHeaders(other.accessToken),
    });
    const otherKey = (await keyRes.json()).apiKey;
    await otherCtx.dispose();

    const createRes = await request.post('/api/public/posts', {
      headers: apiKeyHeaders(apiKey),
      data: { content: 'Protected post' },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const delRes = await request.delete(`/api/public/posts/${post.id}`, {
      headers: apiKeyHeaders(otherKey),
    });
    expect(delRes.status()).toBe(400);
  });

  test('revoked API key is rejected by public endpoints', async ({ request }) => {
    const tempUser = await createUser(request, 'pubapi_revoke');
    const genRes = await request.post('/api/users/me/api-key', {
      headers: authHeaders(tempUser.accessToken),
    });
    const tempKey = (await genRes.json()).apiKey;

    await request.delete('/api/users/me/api-key', {
      headers: authHeaders(tempUser.accessToken),
    });

    const res = await request.get('/api/public/users', {
      headers: apiKeyHeaders(tempKey),
    });
    expect(res.status()).toBe(401);
  });
});
