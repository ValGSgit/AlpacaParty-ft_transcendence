/**
 * Notification Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'notifuser', email: 'n@test.com', is_admin: false };
const sampleNotif = { id: 5, user_id: 1, type: 'friend_request', title: 'Test', is_read: false };

beforeEach(async () => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'notifuser', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/notifications ─────────────────────────────────────
describe('GET /api/notifications', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/notifications');
    expect(res.status).toBe(401);
  });

  test('200 — returns notifications and unread count', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [sampleNotif] }); // getForUser
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }); // countUnread (model uses rows[0].total)
    const res = await request.get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
  });

  test('200 — with unreadOnly filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleNotif] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }); // countUnread
    const res = await request
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── PUT /api/notifications/:id/read ───────────────────────────
describe('PUT /api/notifications/:id/read', () => {
  test('404 — notification not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // markRead → not found
    const res = await request
      .put('/api/notifications/999/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — marks notification as read', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...sampleNotif, is_read: true }] });
    const res = await request
      .put('/api/notifications/5/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notification.is_read).toBe(true);
  });
});

// ── PUT /api/notifications/read-all ───────────────────────────
describe('PUT /api/notifications/read-all', () => {
  test('200 — marks all as read', async () => {
    const res = await auth(request.put('/api/notifications/read-all'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/read/i);
  });
});

// ── DELETE /api/notifications/:id ─────────────────────────────
describe('DELETE /api/notifications/:id', () => {
  test('404 — notification not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // delete → not found
    const res = await request
      .delete('/api/notifications/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — deletes notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Notification.delete uses rowCount
    const res = await request
      .delete('/api/notifications/5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
