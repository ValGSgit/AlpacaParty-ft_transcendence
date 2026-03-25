import { test, expect } from '@playwright/test';
import { createUser, loginViaApi, uniqueId } from './helpers/api.js';

test.describe('Auth API + Session Workflow', () => {
  test('register, login (username/email), me, refresh', async ({ request }) => {
    const created = await createUser(request, 'auth');

    const loginByUsername = await loginViaApi(request, created.username, created.password);
    expect(loginByUsername.accessToken).toBeTruthy();
    expect(loginByUsername.user.username).toBe(created.username);

    const loginByEmail = await loginViaApi(request, created.email, created.password);
    expect(loginByEmail.accessToken).toBeTruthy();
    expect(loginByEmail.user.email).toBe(created.email);

    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${loginByEmail.accessToken}` },
    });
    expect(meRes.ok()).toBeTruthy();

    const meBody = await meRes.json();
    expect(meBody.user.id).toBe(created.user.id);

    const refreshRes = await request.post('/api/auth/refresh', {
      data: { refreshToken: loginByEmail.refreshToken },
    });
    expect(refreshRes.ok()).toBeTruthy();

    const refreshBody = await refreshRes.json();
    expect(refreshBody.accessToken).toBeTruthy();
    expect(refreshBody.refreshToken).toBeTruthy();
  });

  test('duplicate username/email is rejected', async ({ request }) => {
    const id = uniqueId('dup');
    const first = await request.post('/api/auth/register', {
      data: {
        username: id,
        email: `${id}@test.local`,
        password: 'E2ePass123!',
      },
    });
    expect(first.status()).toBe(201);

    const dupUsername = await request.post('/api/auth/register', {
      data: {
        username: id,
        email: `${id}_other@test.local`,
        password: 'E2ePass123!',
      },
    });
    expect(dupUsername.status()).toBe(409);

    const dupEmail = await request.post('/api/auth/register', {
      data: {
        username: `${id}_other`,
        email: `${id}@test.local`,
        password: 'E2ePass123!',
      },
    });
    expect(dupEmail.status()).toBe(409);
  });

  test('invalid credentials and invalid refresh token fail', async ({ request }) => {
    const badLogin = await request.post('/api/auth/login', {
      data: {
        username: 'no_such_user',
        password: 'Wrong123!',
      },
    });
    expect(badLogin.status()).toBe(401);

    const badRefresh = await request.post('/api/auth/refresh', {
      data: { refreshToken: 'invalid.token.value' },
    });
    expect([400, 401].includes(badRefresh.status())).toBeTruthy();
  });
});
