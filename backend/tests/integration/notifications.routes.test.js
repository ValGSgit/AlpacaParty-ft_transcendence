/**
 * Notification Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  notification: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'notifuser', email: 'n@test.com', isAdmin: false };
const sampleNotifPrisma = {
  id: 5, userId: 1, type: 'friend_request', title: 'Test', message: null,
  isRead: false, referenceType: null, referenceId: null, createdAt: new Date().toISOString(),
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'notifuser', isAdmin: false });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/notifications ─────────────────────────────────────
describe('GET /api/notifications', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/notifications');
    expect(res.status).toBe(401);
  });

  test('200 — returns notifications and unread count', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    mockPrisma.notification.findMany.mockResolvedValueOnce([sampleNotifPrisma]); // getForUser
    mockPrisma.notification.count.mockResolvedValueOnce(1); // countUnread
    const res = await request.get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
  });

  test('200 — with unreadOnly filter', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.notification.findMany.mockResolvedValueOnce([sampleNotifPrisma]);
    mockPrisma.notification.count.mockResolvedValueOnce(1);
    const res = await request
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── PUT /api/notifications/:id/read ───────────────────────────
describe('PUT /api/notifications/:id/read', () => {
  test('404 — notification not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 0 }); // markRead → not found
    const res = await request
      .put('/api/notifications/999/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — marks notification as read', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 1 }); // markRead found
    mockPrisma.notification.findUnique.mockResolvedValueOnce({ ...sampleNotifPrisma, isRead: true }); // fetch updated
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
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 3 });
    const res = await auth(request.put('/api/notifications/read-all'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/read/i);
  });
});

// ── DELETE /api/notifications/:id ─────────────────────────────
describe('DELETE /api/notifications/:id', () => {
  test('404 — notification not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.notification.deleteMany.mockResolvedValueOnce({ count: 0 }); // delete → not found
    const res = await request
      .delete('/api/notifications/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — deletes notification', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.notification.deleteMany.mockResolvedValueOnce({ count: 1 }); // deleted
    const res = await request
      .delete('/api/notifications/5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
