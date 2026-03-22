import { test, expect } from '@playwright/test';
import { authHeaders, createUser } from './helpers/api.js';

test.describe('Posts, Likes and Uploads Workflow', () => {
  test('create/update/like/unlike/delete post', async ({ request }) => {
    const author = await createUser(request, 'post_author');
    const viewer = await createUser(request, 'post_viewer');

    const create = await request.post('/api/posts', {
      headers: authHeaders(author.accessToken),
      data: { content: `Post from e2e ${Date.now()}`, isPublic: true },
    });
    expect(create.status()).toBe(201);

    const post = (await create.json()).post;
    expect(post.id).toBeTruthy();

    const feed = await request.get('/api/posts', {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    });
    expect(feed.ok()).toBeTruthy();

    const feedBody = await feed.json();
    expect(feedBody.posts.some((p) => p.id === post.id)).toBeTruthy();

    const like = await request.post(`/api/posts/${post.id}/like`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    });
    expect(like.ok()).toBeTruthy();

    const unlike = await request.delete(`/api/posts/${post.id}/like`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    });
    expect(unlike.ok()).toBeTruthy();

    const update = await request.put(`/api/posts/${post.id}`, {
      headers: authHeaders(author.accessToken),
      data: { content: 'Updated by e2e workflow' },
    });
    expect(update.ok()).toBeTruthy();

    const del = await request.delete(`/api/posts/${post.id}`, {
      headers: { Authorization: `Bearer ${author.accessToken}` },
    });
    expect(del.ok()).toBeTruthy();
  });

  test('upload/list/delete file', async ({ request }) => {
    const user = await createUser(request, 'upload');

    const upload = await request.post('/api/uploads', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      multipart: {
        files: {
          name: 'e2e-note.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(`e2e upload ${Date.now()}`),
        },
      },
    });

    expect(upload.status()).toBe(201);
    const uploaded = await upload.json();
    expect(uploaded.files.length).toBeGreaterThan(0);

    const list = await request.get('/api/uploads', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(list.ok()).toBeTruthy();

    const listBody = await list.json();
    expect(Array.isArray(listBody.files)).toBeTruthy();

    const fileId = listBody.files[0]?.id;
    expect(fileId).toBeTruthy();

    const del = await request.delete(`/api/uploads/${fileId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(del.ok()).toBeTruthy();
  });
});
