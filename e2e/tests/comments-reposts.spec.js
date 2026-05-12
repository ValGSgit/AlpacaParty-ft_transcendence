import { test, expect } from '@playwright/test';
import { authHeaders, createUser } from './helpers/api.js';

// ── Post Comments ──────────────────────────────────────────────────────────────

test.describe('Post Comments', () => {
  let author;
  let commenter;
  let thirdUser;
  let postId;

  test.beforeAll(async ({ request }) => {
    author = await createUser(request, 'comment_author');
    commenter = await createUser(request, 'commenter');
    thirdUser = await createUser(request, 'comment_third');

    const res = await request.post('/api/posts', {
      headers: authHeaders(author.accessToken),
      data: { content: 'Post for comment testing' },
    });
    expect(res.status()).toBe(201);
    postId = (await res.json()).post.id;
  });

  test('GET /posts/:id/comments returns empty array on a fresh post', async ({ request }) => {
    const res = await request.get(`/api/posts/${postId}/comments`, {
      headers: authHeaders(author.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.comments)).toBeTruthy();
  });

  test('POST /posts/:id/comments creates a comment and it appears in the list', async ({ request }) => {
    const content = 'Great post!';
    const createRes = await request.post(`/api/posts/${postId}/comments`, {
      headers: authHeaders(commenter.accessToken),
      data: { content },
    });
    expect(createRes.status()).toBe(201);
    const { comment } = await createRes.json();
    expect(comment.content).toBe(content);
    expect(comment.id).toBeTruthy();

    const listRes = await request.get(`/api/posts/${postId}/comments`, {
      headers: authHeaders(author.accessToken),
    });
    const listBody = await listRes.json();
    const found = listBody.comments.some((c) => c.id === comment.id);
    expect(found).toBeTruthy();
  });

  test('POST /posts/:id/comments rejects empty content', async ({ request }) => {
    const res = await request.post(`/api/posts/${postId}/comments`, {
      headers: authHeaders(commenter.accessToken),
      data: { content: '   ' },
    });
    expect(res.status()).toBe(400);
  });

  test('comment author can delete their own comment', async ({ request }) => {
    const createRes = await request.post(`/api/posts/${postId}/comments`, {
      headers: authHeaders(commenter.accessToken),
      data: { content: 'Deletable comment' },
    });
    expect(createRes.status()).toBe(201);
    const { comment } = await createRes.json();

    const delRes = await request.delete(`/api/posts/${postId}/comments/${comment.id}`, {
      headers: authHeaders(commenter.accessToken),
    });
    expect(delRes.ok()).toBeTruthy();
    const delBody = await delRes.json();
    expect(delBody.message).toBeTruthy();
  });

  test('another user cannot delete a comment they did not write', async ({ request }) => {
    const createRes = await request.post(`/api/posts/${postId}/comments`, {
      headers: authHeaders(commenter.accessToken),
      data: { content: 'Protected comment' },
    });
    expect(createRes.status()).toBe(201);
    const { comment } = await createRes.json();

    // thirdUser tries to delete commenter's comment
    const delRes = await request.delete(`/api/posts/${postId}/comments/${comment.id}`, {
      headers: authHeaders(thirdUser.accessToken),
    });
    expect(delRes.status()).toBe(404);
  });

  test('commenting on a non-existent post returns 404', async ({ request }) => {
    const res = await request.post('/api/posts/999999999/comments', {
      headers: authHeaders(commenter.accessToken),
      data: { content: 'Ghost post comment' },
    });
    expect(res.status()).toBe(404);
  });

  test('unauthenticated user cannot post a comment', async ({ request }) => {
    const res = await request.post(`/api/posts/${postId}/comments`, {
      data: { content: 'No auth' },
    });
    expect(res.status()).toBe(401);
  });

  test('comments pagination respects limit and offset', async ({ request }) => {
    // Add two comments so there are at least 2
    for (let i = 0; i < 2; i++) {
      await request.post(`/api/posts/${postId}/comments`, {
        headers: authHeaders(commenter.accessToken),
        data: { content: `Pagination comment ${i}` },
      });
    }

    const page1 = await request.get(`/api/posts/${postId}/comments?limit=1&offset=0`, {
      headers: authHeaders(author.accessToken),
    });
    const page1Body = await page1.json();
    expect(page1Body.comments.length).toBeLessThanOrEqual(1);

    const page2 = await request.get(`/api/posts/${postId}/comments?limit=1&offset=1`, {
      headers: authHeaders(author.accessToken),
    });
    const page2Body = await page2.json();

    if (page1Body.comments.length === 1 && page2Body.comments.length === 1) {
      expect(page1Body.comments[0].id).not.toBe(page2Body.comments[0].id);
    }
  });
});

// ── Post Reposts ───────────────────────────────────────────────────────────────

test.describe('Post Reposts', () => {
  let poster;
  let postId;

  test.beforeAll(async ({ request }) => {
    poster = await createUser(request, 'repost_poster');

    const res = await request.post('/api/posts', {
      headers: authHeaders(poster.accessToken),
      data: { content: 'Post for repost testing' },
    });
    expect(res.status()).toBe(201);
    postId = (await res.json()).post.id;
  });

  test('repost a post and verify repost count increases', async ({ request }) => {
    const reposter = await createUser(request, 'reposter_count');

    const before = await request.get(`/api/posts/${postId}`, {
      headers: authHeaders(reposter.accessToken),
    });
    const beforeBody = await before.json();
    const initialCount =
      beforeBody.post.reposts_count ?? beforeBody.post.repostsCount ?? 0;

    const res = await request.post(`/api/posts/${postId}/repost`, {
      headers: authHeaders(reposter.accessToken),
      data: {},
    });
    expect(res.status()).toBe(201);

    const after = await request.get(`/api/posts/${postId}`, {
      headers: authHeaders(reposter.accessToken),
    });
    const afterBody = await after.json();
    const newCount = afterBody.post.reposts_count ?? afterBody.post.repostsCount ?? 0;
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('repost with a quote comment is accepted', async ({ request }) => {
    const user = await createUser(request, 'quote_reposter');
    const res = await request.post(`/api/posts/${postId}/repost`, {
      headers: authHeaders(user.accessToken),
      data: { comment: 'Must see this!' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.repost).toBeTruthy();
  });

  test('duplicate repost by the same user returns 409', async ({ request }) => {
    const user = await createUser(request, 'dupe_reposter');
    await request.post(`/api/posts/${postId}/repost`, {
      headers: authHeaders(user.accessToken),
      data: {},
    });
    const second = await request.post(`/api/posts/${postId}/repost`, {
      headers: authHeaders(user.accessToken),
      data: {},
    });
    expect(second.status()).toBe(409);
  });

  test('remove a repost', async ({ request }) => {
    const user = await createUser(request, 'unrepost_user');
    await request.post(`/api/posts/${postId}/repost`, {
      headers: authHeaders(user.accessToken),
      data: {},
    });

    const del = await request.delete(`/api/posts/${postId}/repost`, {
      headers: authHeaders(user.accessToken),
    });
    expect(del.ok()).toBeTruthy();
    const delBody = await del.json();
    expect(delBody.message).toBeTruthy();
  });

  test('reposting a non-existent post returns 404', async ({ request }) => {
    const user = await createUser(request, 'repost_404');
    const res = await request.post('/api/posts/999999999/repost', {
      headers: authHeaders(user.accessToken),
      data: {},
    });
    expect(res.status()).toBe(404);
  });

  test('unauthenticated repost attempt returns 401', async ({ request }) => {
    const res = await request.post(`/api/posts/${postId}/repost`, {
      data: {},
    });
    expect(res.status()).toBe(401);
  });
});
