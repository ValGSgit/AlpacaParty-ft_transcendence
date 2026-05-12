import { test, expect } from '@playwright/test';
import { authHeaders, createUser } from './helpers/api.js';

// ── Post Ownership ─────────────────────────────────────────────────────────────

test.describe('Post ownership enforcement', () => {
  let owner;
  let stranger;
  let postId;

  test.beforeAll(async ({ request }) => {
    owner = await createUser(request, 'auth_owner');
    stranger = await createUser(request, 'auth_stranger');

    const res = await request.post('/api/posts', {
      headers: authHeaders(owner.accessToken),
      data: { content: 'Owner post', is_public: true },
    });
    expect(res.status()).toBe(201);
    postId = (await res.json()).post.id;
  });

  test('stranger cannot update another user\'s post', async ({ request }) => {
    const res = await request.put(`/api/posts/${postId}`, {
      headers: authHeaders(stranger.accessToken),
      data: { content: 'Hijacked content' },
    });
    // Backend returns 404 ("Post not found or not yours") to avoid leaking IDs
    expect(res.status()).toBe(404);
  });

  test('stranger cannot delete another user\'s post', async ({ request }) => {
    const res = await request.delete(`/api/posts/${postId}`, {
      headers: authHeaders(stranger.accessToken),
    });
    expect(res.status()).toBe(404);
  });

  test('unauthenticated user cannot update a post', async ({ request }) => {
    const res = await request.put(`/api/posts/${postId}`, {
      data: { content: 'No token update' },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated user cannot delete a post', async ({ request }) => {
    const res = await request.delete(`/api/posts/${postId}`);
    expect(res.status()).toBe(401);
  });

  test('owner can still update and delete their own post', async ({ request }) => {
    const createRes = await request.post('/api/posts', {
      headers: authHeaders(owner.accessToken),
      data: { content: 'Post to update and delete' },
    });
    expect(createRes.status()).toBe(201);
    const id = (await createRes.json()).post.id;

    const updateRes = await request.put(`/api/posts/${id}`, {
      headers: authHeaders(owner.accessToken),
      data: { content: 'Updated by owner' },
    });
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`/api/posts/${id}`, {
      headers: authHeaders(owner.accessToken),
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});

// ── File Upload Ownership ──────────────────────────────────────────────────────

test.describe('File upload ownership enforcement', () => {
  test('user cannot delete a file uploaded by someone else', async ({ request }) => {
    const uploader = await createUser(request, 'auth_uploader');
    const thief = await createUser(request, 'auth_thief');

    // Uploader uploads a file
    const upload = await request.post('/api/uploads', {
      headers: authHeaders(uploader.accessToken),
      multipart: {
        files: {
          name: 'auth-test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('authorization test file'),
        },
      },
    });
    expect(upload.status()).toBe(201);
    const fileId = (await upload.json()).files[0].id;

    // Thief tries to delete the uploader's file — backend says 404
    const delRes = await request.delete(`/api/uploads/${fileId}`, {
      headers: authHeaders(thief.accessToken),
    });
    expect(delRes.status()).toBe(404);

    // The original uploader can still delete it
    const ownerDel = await request.delete(`/api/uploads/${fileId}`, {
      headers: authHeaders(uploader.accessToken),
    });
    expect(ownerDel.ok()).toBeTruthy();
  });

  test('unauthenticated user cannot delete any file', async ({ request }) => {
    const user = await createUser(request, 'auth_noauth_upload');

    const upload = await request.post('/api/uploads', {
      headers: authHeaders(user.accessToken),
      multipart: {
        files: {
          name: 'noauth.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('noauth test'),
        },
      },
    });
    expect(upload.status()).toBe(201);
    const fileId = (await upload.json()).files[0].id;

    const delRes = await request.delete(`/api/uploads/${fileId}`);
    expect(delRes.status()).toBe(401);
  });
});

// ── Friend Request Ownership ───────────────────────────────────────────────────

test.describe('Friend request ownership enforcement', () => {
  test('user cannot accept a friend request addressed to someone else', async ({ request }) => {
    const sender = await createUser(request, 'auth_fr_sender');
    const receiver = await createUser(request, 'auth_fr_receiver');
    const outsider = await createUser(request, 'auth_fr_outsider');

    // Sender requests to be friends with receiver
    const reqRes = await request.post('/api/friends/requests', {
      headers: authHeaders(sender.accessToken),
      data: { userId: receiver.user.id },
    });
    expect([200, 201].includes(reqRes.status())).toBeTruthy();
    const requestId = (await reqRes.json()).request.id;

    // Outsider attempts to accept a request they have no part in
    const acceptRes = await request.put(`/api/friends/requests/${requestId}/accept`, {
      headers: authHeaders(outsider.accessToken),
    });
    expect([403, 404].includes(acceptRes.status())).toBeTruthy();
  });

  test('sender cannot accept their own outgoing request', async ({ request }) => {
    const sender = await createUser(request, 'auth_self_accept_s');
    const receiver = await createUser(request, 'auth_self_accept_r');

    const reqRes = await request.post('/api/friends/requests', {
      headers: authHeaders(sender.accessToken),
      data: { userId: receiver.user.id },
    });
    expect([200, 201].includes(reqRes.status())).toBeTruthy();
    const requestId = (await reqRes.json()).request.id;

    // Sender tries to accept their own outgoing request
    const acceptRes = await request.put(`/api/friends/requests/${requestId}/accept`, {
      headers: authHeaders(sender.accessToken),
    });
    expect([400, 403, 404].includes(acceptRes.status())).toBeTruthy();
  });
});

// ── Notification Ownership ─────────────────────────────────────────────────────

test.describe('Notification ownership enforcement', () => {
  test('user cannot delete a notification belonging to someone else', async ({ request }) => {
    const sender = await createUser(request, 'auth_notif_sender');
    const receiver = await createUser(request, 'auth_notif_rcvr');
    const outsider = await createUser(request, 'auth_notif_outsider');

    // Generate a notification for receiver
    await request.post('/api/friends/requests', {
      headers: authHeaders(sender.accessToken),
      data: { userId: receiver.user.id },
    });

    const listRes = await request.get('/api/notifications', {
      headers: authHeaders(receiver.accessToken),
    });
    const { notifications } = await listRes.json();
    if (notifications.length === 0) return;

    const notifId = notifications[0].id;

    // Outsider tries to delete receiver's notification
    const delRes = await request.delete(`/api/notifications/${notifId}`, {
      headers: authHeaders(outsider.accessToken),
    });
    expect([403, 404].includes(delRes.status())).toBeTruthy();
  });
});
