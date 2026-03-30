/**
 * Friend Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock prisma ──
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  friend: { findFirst: jest.fn(), findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  friendRequest: { findFirst: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
  blockedUser: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
  notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'me', email: 'me@test.com', isAdmin: false, isPublic: true };

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'me', isAdmin: false });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/friends ───────────────────────────────────────────
describe('GET /api/friends', () => {
  test('200 — returns friends list', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.getFriends → friend.findMany(include: { friend: ... })
    mockPrisma.friend.findMany.mockResolvedValueOnce([]);
    const res = await request.get('/api/friends').set('Authorization', `Bearer ${token}`);
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.getOnlineFriends → friend.findMany
    mockPrisma.friend.findMany.mockResolvedValueOnce([
      { friend: { id: 2, username: 'buddy', avatar: null, isOnline: true, status: 'online', level: 1 } },
    ]);
    const res = await request.get('/api/friends/online').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
  });
});

// ── GET /api/friends/requests ────────────────────────────────
describe('GET /api/friends/requests', () => {
  test('200 — returns received and sent requests', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Promise.all([getPendingReceived, getPendingSent]) — both call friendRequest.findMany
    mockPrisma.friendRequest.findMany
      .mockResolvedValueOnce([
        { id: 10, senderId: 2, receiverId: 1, status: 'pending', createdAt: '2026-01-01', sender: { username: 'other', avatar: null } },
      ])
      .mockResolvedValueOnce([]);
    const res = await request.get('/api/friends/requests').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received');
    expect(res.body).toHaveProperty('sent');
    expect(res.body.received).toHaveLength(1);
  });
});

// ── GET /api/friends/blocked ────────────────────────────────
describe('GET /api/friends/blocked', () => {
  test('200 — returns blocked list', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.getBlocked → blockedUser.findMany
    mockPrisma.blockedUser.findMany.mockResolvedValueOnce([]);
    const res = await request.get('/api/friends/blocked').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('blocked');
  });
});

// ── POST /api/friends/requests ────────────────────────────────
describe('POST /api/friends/requests', () => {
  test('400 — missing userId', async () => {
    const res = await auth(request.post('/api/friends/requests')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('userId');
  });

  test('400 — cannot friend yourself', async () => {
    const res = await auth(request.post('/api/friends/requests')).send({ userId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/yourself/i);
  });

  test('404 — target user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    // User.findById(target) → user.findUnique → null
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 99 });
    expect(res.status).toBe(404);
  });

  test('201 — sends friend request', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'other' }); // User.findById target
    // Friend.sendRequest → friendRequest.upsert
    mockPrisma.friendRequest.upsert.mockResolvedValueOnce({ id: 5, senderId: 1, receiverId: 2, status: 'pending' });
    // NotificationService.friendRequest → notification.create (awaited)

    const res = await request
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 2 });

    expect(res.status).toBe(201);
    expect(res.body.request).toHaveProperty('senderId', 1);
  });
});

// ── PUT /api/friends/requests/:id/accept ─────────────────────
describe('PUT /api/friends/requests/:id/accept', () => {
  test('404 — request not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.acceptRequest: findFirst → null → throws { status: 404 }
    mockPrisma.friendRequest.findFirst.mockResolvedValueOnce(null);
    const res = await request
      .put('/api/friends/requests/999/accept')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — accepts friend request', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.acceptRequest: findFirst → pending request
    mockPrisma.friendRequest.findFirst.mockResolvedValueOnce({ id: 5, senderId: 2, receiverId: 1, status: 'pending' });
    // $transaction([friendRequest.update, friend.createMany]) — array form, ops called eagerly
    mockPrisma.friendRequest.update.mockResolvedValueOnce({ id: 5, senderId: 2, receiverId: 1, status: 'accepted' });
    mockPrisma.friend.createMany.mockResolvedValueOnce({ count: 2 });
    // NotificationService.friendAccepted → notification.create (awaited)
    // GamificationService.checkSocialAchievements → Friend.count → friend.count → 2 (< 10, no unlock)
    mockPrisma.friend.count.mockResolvedValueOnce(2);

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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.declineRequest → friendRequest.updateMany → { count: 0 } → null → 404
    mockPrisma.friendRequest.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await request
      .put('/api/friends/requests/999/decline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — declines friend request', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.friendRequest.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.friendRequest.findUnique.mockResolvedValueOnce({ id: 5, senderId: 2, receiverId: 1, status: 'declined' });
    const res = await request
      .put('/api/friends/requests/5/decline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('declined');
  });
});

// ── DELETE /api/friends/:id ───────────────────────────────────
describe('DELETE /api/friends/:id', () => {
  test('200 — removes friend', async () => {
    // Friend.removeFriend → friend.deleteMany
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Friend.blockUser: removeFriend → friend.deleteMany, then blockedUser.upsert
    mockPrisma.friend.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockPrisma.blockedUser.upsert.mockResolvedValueOnce({});
    const res = await request
      .post('/api/friends/block')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/blocked/i);
  });
});

// ── DELETE /api/friends/block/:id ────────────────────────────
describe('DELETE /api/friends/block/:id', () => {
  test('200 — unblocks user', async () => {
    // Friend.unblockUser → blockedUser.deleteMany
    const res = await auth(request.delete('/api/friends/block/3'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unblocked/i);
  });
});
