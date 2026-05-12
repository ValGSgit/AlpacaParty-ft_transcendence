import { expect } from '@playwright/test';

export function uniqueId(prefix = 'e2e') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function getSetCookieHeaders(res) {
  if (typeof res.headersArray === 'function') {
    return res
      .headersArray()
      .filter((header) => header.name.toLowerCase() === 'set-cookie')
      .map((header) => header.value);
  }

  const header = res.headers()['set-cookie'];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

function getCookieValue(setCookieHeaders, cookieName) {
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

export async function registerViaApi(request, { username, email, password = 'E2ePass123!' }) {
  const res = await request.post('/api/auth/register', {
    data: { username, email, password },
  });

  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const setCookieHeaders = getSetCookieHeaders(res);

  return {
    user: body.user,
    accessToken: body.accessToken ?? getCookieValue(setCookieHeaders, 'jwt_token'),
    refreshToken: body.refreshToken ?? getCookieValue(setCookieHeaders, 'refresh_token'),
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
    Cookie: `jwt_token=${token}`,
  };
}

export function refreshHeaders(token) {
  return {
    Cookie: `refresh_token=${token}`,
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
  const body = await res.json();
  const setCookieHeaders = getSetCookieHeaders(res);

  return {
    ...body,
    accessToken: body.accessToken ?? getCookieValue(setCookieHeaders, 'jwt_token'),
    refreshToken: body.refreshToken ?? getCookieValue(setCookieHeaders, 'refresh_token'),
  };
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
    headers: authHeaders(token),
  });
  expect(pending.ok()).toBeTruthy();

  const body = await pending.json();
  const reqId = body.received?.[0]?.id;
  expect(reqId).toBeTruthy();

  const accepted = await request.put(`/api/friends/requests/${reqId}/accept`, {
    headers: authHeaders(token),
  });
  expect(accepted.ok()).toBeTruthy();

  return accepted.json();
}

export async function setAuthToken(page, token) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
}

export async function makeFriends(request, tokenA, userBId, tokenB) {
  await requestFriendship(request, tokenA, userBId);
  await acceptFirstPending(request, tokenB);
}

export async function generateApiKey(request, token) {
  const res = await request.post('/api/users/me/api-key', {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.apiKey ?? body.key ?? body.api_key;
}
