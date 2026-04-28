import { test, expect } from '@playwright/test';
import { authHeaders, loginViaApi, uniqueId } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const body = await loginViaApi(request, email, password);
  return { token: body.accessToken, user: body.user };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Social Feed', () => {
  let demoToken;
  let demoUser;

  test.beforeAll(async ({ request }) => {
    const demo = await loginAsSeeded(request, 'live_demo@alpacaparty.test');
    demoToken = demo.token;
    demoUser = demo.user;
  });

  test('GET /api/posts returns feed', async ({ request }) => {
    const res = await request.get('/api/posts', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.posts)).toBeTruthy();
    expect(body.posts.length).toBeGreaterThan(0);
  });

  test('create a text post and verify it appears in feed', async ({ request }) => {
    const content = `E2E test post ${uniqueId('post')}`;

    const createRes = await request.post('/api/posts', {
      headers: authHeaders(demoToken),
      data: { content },
    });
    expect(createRes.status()).toBe(201);

    const created = await createRes.json();
    expect(created.post.content).toBe(content);
    expect(created.post.id).toBeTruthy();

    // Verify it shows up in user's posts
    const feedRes = await request.get(`/api/posts/user/${demoUser.id}`, {
      headers: authHeaders(demoToken),
    });
    expect(feedRes.ok()).toBeTruthy();

    const feedBody = await feedRes.json();
    const found = feedBody.posts.some((p) => p.id === created.post.id);
    expect(found).toBeTruthy();
  });

  test('create post with image URL', async ({ request }) => {
    const content = `Image post ${uniqueId('img')}`;
    const imageUrl = 'https://placehold.co/400x300.png';

    const res = await request.post('/api/posts', {
      headers: authHeaders(demoToken),
      data: { content, imageUrl },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.post.content).toBe(content);
    expect(body.post.imageUrl || body.post.image_url).toBeTruthy();
  });

  test('like and unlike a post', async ({ request }) => {
    // Create a post to like
    const createRes = await request.post('/api/posts', {
      headers: authHeaders(demoToken),
      data: { content: `Likeable post ${uniqueId('like')}` },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    // Like the post
    const likeRes = await request.post(`/api/posts/${post.id}/like`, {
      headers: authHeaders(demoToken),
    });
    expect(likeRes.ok()).toBeTruthy();

    // Verify like count or liked status
    const getRes = await request.get(`/api/posts/${post.id}`, {
      headers: authHeaders(demoToken),
    });
    expect(getRes.ok()).toBeTruthy();
    const liked = await getRes.json();
    expect(
      liked.post.likeCount > 0 ||
      liked.post.likes > 0 ||
      liked.post.isLiked === true ||
      liked.post._count?.likes > 0,
    ).toBeTruthy();

    // Unlike the post
    const unlikeRes = await request.delete(`/api/posts/${post.id}/like`, {
      headers: authHeaders(demoToken),
    });
    expect(unlikeRes.ok()).toBeTruthy();
  });

  test('delete own post', async ({ request }) => {
    // Create a post then delete it
    const createRes = await request.post('/api/posts', {
      headers: authHeaders(demoToken),
      data: { content: `Deletable post ${uniqueId('del')}` },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const delRes = await request.delete(`/api/posts/${post.id}`, {
      headers: authHeaders(demoToken),
    });
    expect(delRes.ok()).toBeTruthy();

    // Verify it no longer exists
    const getRes = await request.get(`/api/posts/${post.id}`, {
      headers: authHeaders(demoToken),
    });
    expect(getRes.status()).toBe(404);
  });

  test('feed pagination with limit and offset', async ({ request }) => {
    const page1 = await request.get('/api/posts?limit=3&offset=0', {
      headers: authHeaders(demoToken),
    });
    expect(page1.ok()).toBeTruthy();
    const body1 = await page1.json();
    expect(body1.posts.length).toBeLessThanOrEqual(3);

    if (body1.posts.length === 3) {
      const page2 = await request.get('/api/posts?limit=3&offset=3', {
        headers: authHeaders(demoToken),
      });
      expect(page2.ok()).toBeTruthy();
      const body2 = await page2.json();

      // Pages should not overlap
      if (body2.posts.length > 0) {
        const ids1 = body1.posts.map((p) => p.id);
        const ids2 = body2.posts.map((p) => p.id);
        const overlap = ids1.filter((id) => ids2.includes(id));
        expect(overlap.length).toBe(0);
      }
    }
  });

  test('update an existing post', async ({ request }) => {
    const createRes = await request.post('/api/posts', {
      headers: authHeaders(demoToken),
      data: { content: `Editable ${uniqueId('edit')}` },
    });
    expect(createRes.status()).toBe(201);
    const { post } = await createRes.json();

    const updatedContent = `Updated ${uniqueId('edited')}`;
    const updateRes = await request.put(`/api/posts/${post.id}`, {
      headers: authHeaders(demoToken),
      data: { content: updatedContent },
    });
    expect(updateRes.ok()).toBeTruthy();

    const updatedBody = await updateRes.json();
    expect(updatedBody.post.content).toBe(updatedContent);
  });
});
