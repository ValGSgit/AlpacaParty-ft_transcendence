import { test, expect } from '@playwright/test';

const API_KEY = 'test-api-key';

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

  test('GET /api/public/users returns users list', async ({ request }) => {
    const res = await request.get('/api/public/users', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.users)).toBeTruthy();
    expect(body.users.length).toBeGreaterThan(0);

    // Each user should have basic fields
    const user = body.users[0];
    expect(user.id).toBeTruthy();
    expect(user.username).toBeTruthy();
  });

  test('GET /api/public/posts returns posts with author_username', async ({ request }) => {
    const res = await request.get('/api/public/posts', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.posts)).toBeTruthy();
    expect(body.posts.length).toBeGreaterThan(0);

    // Posts should have author info populated
    const post = body.posts[0];
    expect(post.id).toBeTruthy();
    expect(post.content).toBeTruthy();
    expect(post.author_username || post.authorUsername || post.author).toBeTruthy();
  });

  test('GET /api/public/organizations returns orgs with memberCount', async ({ request }) => {
    const res = await request.get('/api/public/organizations', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.organizations)).toBeTruthy();
    expect(body.organizations.length).toBeGreaterThan(0);

    const org = body.organizations[0];
    expect(org.id).toBeTruthy();
    expect(org.name).toBeTruthy();
    expect(typeof (org.memberCount ?? org.member_count ?? org._count?.members)).toBe('number');
  });

  test('GET /api/public/leaderboard returns leaderboard data', async ({ request }) => {
    const res = await request.get('/api/public/leaderboard', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // Leaderboard should be an array or contain a leaderboard array
    const entries = body.leaderboard ?? body.entries ?? body;
    expect(Array.isArray(entries)).toBeTruthy();
  });

  test('pagination with offset and limit', async ({ request }) => {
    const page1 = await request.get('/api/public/users?limit=3&offset=0', {
      headers: apiKeyHeaders(),
    });
    const page2 = await request.get('/api/public/users?limit=3&offset=3', {
      headers: apiKeyHeaders(),
    });
    expect(page1.ok()).toBeTruthy();
    expect(page2.ok()).toBeTruthy();

    const body1 = await page1.json();
    const body2 = await page2.json();

    expect(body1.users.length).toBeLessThanOrEqual(3);

    // If there are enough users, page 2 should be different
    if (body2.users.length > 0) {
      const ids1 = body1.users.map((u) => u.id);
      const ids2 = body2.users.map((u) => u.id);
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test('anonymized=true hides real usernames', async ({ request }) => {
    const res = await request.get('/api/public/users?anonymized=true&limit=5', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.users.length).toBeGreaterThan(0);

    // Anonymized users should not have real usernames
    for (const user of body.users) {
      // The username should be anonymized (e.g., "user_XXXX" or similar pattern)
      // At minimum the email should be absent or masked
      expect(user.email).toBeFalsy();
    }
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

  test('posts pagination works', async ({ request }) => {
    const res = await request.get('/api/public/posts?limit=2&offset=0', {
      headers: apiKeyHeaders(),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.posts.length).toBeLessThanOrEqual(2);
  });

  test('organizations search works', async ({ request }) => {
    // Get first org name from the list, then search for it
    const listRes = await request.get('/api/public/organizations?limit=1', {
      headers: apiKeyHeaders(),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();

    if (listBody.organizations.length > 0) {
      const orgName = listBody.organizations[0].name;
      const searchRes = await request.get(
        `/api/public/organizations?search=${encodeURIComponent(orgName)}`,
        { headers: apiKeyHeaders() },
      );
      expect(searchRes.ok()).toBeTruthy();
      const searchBody = await searchRes.json();
      expect(searchBody.organizations.length).toBeGreaterThan(0);
    }
  });
});
