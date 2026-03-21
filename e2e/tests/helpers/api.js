import { expect } from '@playwright/test';

export function uniqueId(prefix = 'e2e') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export async function registerViaApi(request, { username, email, password = 'E2ePass123!' }) {
  const res = await request.post('/api/auth/register', {
    data: { username, email, password },
  });

  expect(res.ok()).toBeTruthy();
  const body = await res.json();

  return {
    user: body.user,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    password,
    username,
    email,
  };
}

export async function createUser(request, prefix = 'user') {
  const id = uniqueId(prefix);
  return registerViaApi(request, {
    username: id,
    email: `${id}@test.local`,
  });
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function loginViaApi(request, usernameOrEmail, password) {
  const res = await request.post('/api/auth/login', {
    data: {
      username: usernameOrEmail,
      password,
    },
  });

  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function requestFriendship(request, token, userId) {
  const res = await request.post('/api/friends/requests', {
    headers: authHeaders(token),
    data: { userId },
  });

  expect([200, 201].includes(res.status())).toBeTruthy();
  return res.json();
}

export async function acceptFirstPending(request, token) {
  const pending = await request.get('/api/friends/requests', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(pending.ok()).toBeTruthy();

  const body = await pending.json();
  const reqId = body.received?.[0]?.id;
  expect(reqId).toBeTruthy();

  const accepted = await request.put(`/api/friends/requests/${reqId}/accept`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(accepted.ok()).toBeTruthy();

  return accepted.json();
}

export async function setAuthToken(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
}
