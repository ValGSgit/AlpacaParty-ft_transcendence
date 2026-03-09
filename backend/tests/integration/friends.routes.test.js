/**
 * Friend Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

const mockQuery = jest.fn();
const mockClient = { query: jest.fn(), release: jest.fn() };
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn().mockResolvedValue(mockClient),
  default: { on: jest.fn(), query: mockQuery },
}));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'me', email: 'me@test.com', is_admin: false };

beforeEach(async () => {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  // Default fallback — extra queries (notifications, gamification) return empty
  mockQuery.mockResolvedValue({ rows: [] });
  mockClient.query.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'me', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/friends ───────────────────────────────────────────
describe('GET /api/friends', () => {
  test('200 — returns friends list', async () => {
    const res = await auth(request.get('/api/friends'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('friends');
  });

  test('401 — requires auth', async () => {
    const res = await request.get('/api/friends');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/friends/online ───────────────────────────────────
describe('GET /api/friends/online', () => {
  test('200 — returns online friends', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, username: 'friend', is_online: true }] });
    const res = await request.get('/api/friends/online').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
  });
});

// ── GET /api/friends/requests ────────────────────────────────
describe('GET /api/friends/requests', () => {
  test('200 — returns received and sent requests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, sender_id: 2, receiver_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request.get('/api/friends/requests').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received');
    expect(res.body).toHaveProperty('sent');
  });
});

// ── GET /api/friends/blocked ────────────────────────────────
describe('GET /api/friends/blocked', () => {
  test('200 — returns blocked list', async () => {
    const res = await auth(request.get('/api/friends/blocked'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('blocked');
  });
});

// ── POST /api/friends/requests ────────────────────────────────
describe('POST /api/friends/requests', () => {
  test('400 — missing userId', async () => {
    const res = await auth(request.post('/api/friends/requests')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/userId/i);
  });

  test('400 — cannot friend yourself', async () => {
    const res = await auth(request.post('/api/friends/requests')).send({ userId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/yourself/i);
  });

  test('404 — target user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [] }); // User.findById → not found
    const res = await request
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 99 });
    expect(res.status).toBe(404);
  });

  test('201 — sends friend request', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, username: 'other' }] }); // findById target
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, sender_id: 1, receiver_id: 2 }] }); // sendRequest
    // notificationService.friendRequest → Notification.create
    const res = await request
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 2 });
    expect(res.status).toBe(201);
    expect(res.body.request).toHaveProperty('sender_id', 1);
  });
});

// ── PUT /api/friends/requests/:id/accept ─────────────────────
describe('PUT /api/friends/requests/:id/accept', () => {
  test('404 — request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    // acceptRequest uses getClient transaction
    mockClient.query.mockResolvedValueOnce(null); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE — not found
    mockClient.query.mockResolvedValueOnce(null); // ROLLBACK
    const res = await request
      .put('/api/friends/requests/999/accept')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — accepts friend request', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    const reqRow = { id: 5, sender_id: 2, receiver_id: 1, status: 'accepted' };
    mockClient.query.mockResolvedValueOnce(null); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [reqRow] }); // UPDATE request
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT friends
    mockClient.query.mockResolvedValueOnce(null); // COMMIT
    // post-transaction (both awaited): Notification.create, then Friend.count
    mockQuery.mockResolvedValueOnce({ rows: [] }); // NotificationService.friendAccepted → Notification.create
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] }); // GamificationService → Friend.count (uses rows[0].total)
    const res = await request
      .put('/api/friends/requests/5/accept')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('accepted');
  });
});

// ── PUT /api/friends/requests/:id/decline ────────────────────
describe('PUT /api/friends/requests/:id/decline', () => {
  test('404 — request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // declineRequest → not found
    const res = await request
      .put('/api/friends/requests/999/decline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — declines friend request', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, sender_id: 2, receiver_id: 1, status: 'declined' }] });
    const res = await request
      .put('/api/friends/requests/5/decline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── DELETE /api/friends/:id ───────────────────────────────────
describe('DELETE /api/friends/:id', () => {
  test('200 — removes friend', async () => {
    const res = await auth(request.delete('/api/friends/2'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });
});

// ── POST /api/friends/block ───────────────────────────────────
describe('POST /api/friends/block', () => {
  test('400 — missing userId', async () => {
    const res = await auth(request.post('/api/friends/block')).send({});
    expect(res.status).toBe(400);
  });

  test('200 — blocks user', async () => {
    const res = await auth(request.post('/api/friends/block')).send({ userId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/blocked/i);
  });
});

// ── DELETE /api/friends/block/:id ────────────────────────────
describe('DELETE /api/friends/block/:id', () => {
  test('200 — unblocks user', async () => {
    const res = await auth(request.delete('/api/friends/block/3'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unblocked/i);
  });
});
