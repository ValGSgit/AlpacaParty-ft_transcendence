/**
 * User Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock prisma ──
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  friend: { findFirst: jest.fn(), findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  friendRequest: { findFirst: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
  notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let validToken;

const authUser = { id: 1, username: 'authed', email: 'a@b.com', avatar: '/avatars/default.svg', bio: '', status: 'online', isOnline: true, isAdmin: false, isPublic: true };
const adminUser = { ...authUser, id: 99, username: 'admin', email: 'admin@test.com', isAdmin: true };

beforeEach(async () => {
  jest.resetAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  validToken = AuthService.generateAccessToken({ id: 1, username: 'authed', isAdmin: false });
});

function mockAuth() {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
}

function mockAdminAuth() {
  mockPrisma.user.findUnique.mockResolvedValueOnce(adminUser);
}

// ────────────────────────────────────────────────────────────────
// GET /api/users/me
// ────────────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  test('200 — returns current user', async () => {
    mockAuth();
    const res = await request.get('/api/users/me').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('authed');
  });

  test('401 — without token', async () => {
    const res = await request.get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/users/me
// ────────────────────────────────────────────────────────────────
describe('DELETE /api/users/me', () => {
  test('200 — deletes authenticated user account', async () => {
    mockAuth();
    mockPrisma.user.delete.mockResolvedValueOnce({}); // deleteById → success

    const res = await request.delete('/api/users/me').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logout).toBe(true);
  });

  test('404 — returns not found when user is already deleted', async () => {
    mockAuth();
    mockPrisma.user.delete.mockRejectedValueOnce(new Error('Not found')); // deleteById → false

    const res = await request.delete('/api/users/me').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
  });

  test('401 — requires auth', async () => {
    const res = await request.delete('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// PUT /api/users/me
// ────────────────────────────────────────────────────────────────
describe('PUT /api/users/me', () => {
  test('200 — update bio', async () => {
    mockAuth();
    mockPrisma.user.update.mockResolvedValueOnce({ ...authUser, bio: 'New bio' });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ bio: 'New bio' });

    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('New bio');
  });

  test('200 — update username (available)', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce(null); // findByUsername → available
    mockPrisma.user.update.mockResolvedValueOnce({ ...authUser, username: 'newname' }); // update

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ username: 'newname' });

    expect(res.status).toBe(200);
  });

  test('400 — username too short', async () => {
    mockAuth();
    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ username: 'ab' });

    expect(res.status).toBe(400);
  });

  test('400 — username invalid chars', async () => {
    mockAuth();
    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ username: 'bad user!' });

    expect(res.status).toBe(400);
  });

  test('409 — username taken', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 99, username: 'taken' }); // findByUsername → exists

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ username: 'taken' });

    expect(res.status).toBe(409);
  });

  test('409 — email taken', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 99, email: 'taken@x.com' }); // findByEmail → exists

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'taken@x.com' });

    expect(res.status).toBe(409);
  });

  test('200 — empty body returns current user', async () => {
    mockAuth();
    // User.update with no sets → calls findById
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
  });

  test('200 — update email (available)', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce(null); // findByEmail → available
    mockPrisma.user.update.mockResolvedValueOnce({ ...authUser, email: 'new@email.com' }); // update

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'new@email.com' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@email.com');
  });

  test('200 — update status', async () => {
    mockAuth();
    mockPrisma.user.update.mockResolvedValueOnce({ ...authUser, status: 'Away' });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'Away' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('Away');
  });

  test('200 — update coins', async () => {
    mockAuth();
    mockPrisma.user.update.mockResolvedValueOnce({ ...authUser, coins: 500 });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ coins: 500 });

    expect(res.status).toBe(200);
    expect(res.body.user.coins).toBe(500);
  });
});

// ────────────────────────────────────────────────────────────────
// PUT /api/users/me/password
// ────────────────────────────────────────────────────────────────
describe('PUT /api/users/me/password', () => {
  test('200 — password changed successfully', async () => {
    const currentHash = await AuthService.hashPassword('OldPass1');
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...authUser, passwordHash: currentHash }); // findByIdWithPassword

    const res = await request
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'OldPass1', newPassword: 'NewPass1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  test('400 — missing fields', async () => {
    mockAuth();
    const res = await request
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'Old1' });

    expect(res.status).toBe(400);
  });

  test('401 — current password incorrect', async () => {
    const hash = await AuthService.hashPassword('RealPass1');
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...authUser, passwordHash: hash }); // findByIdWithPassword

    const res = await request
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass1' });

    expect(res.status).toBe(401);
  });

  test('400 — new password too weak', async () => {
    const hash = await AuthService.hashPassword('OldPass1');
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...authUser, passwordHash: hash }); // findByIdWithPassword

    const res = await request
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'OldPass1', newPassword: 'weak' });

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ────────────────────────────────────────────────────────────────
describe('GET /api/users/:id', () => {
  test('200 — returns user by id', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'other', bio: 'hi', isPublic: true });

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('other');
  });

  test('404 — user not found', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request.get('/api/users/999').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });

  test('403 — private profile blocked for non-friends', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'private', isPublic: false });
    mockPrisma.friend.findFirst.mockResolvedValueOnce(null); // areFriends → false

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  test('200 — private profile visible to friends (email redacted)', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 2, username: 'private', email: 'private@test.com', isPublic: false,
      avatar: '/a.png', bio: 'x', status: 's', isOnline: false, xp: 10, level: 1,
      lastSeen: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    mockPrisma.friend.findFirst.mockResolvedValueOnce({ userId: 1, friendId: 2 }); // areFriends → true

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.username).toBe('private');
  });

  test('200 — private profile visible to admins', async () => {
    const adminToken = AuthService.generateAccessToken({ id: 99, username: 'admin', isAdmin: true });
    mockAdminAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 2, username: 'private', email: 'private@test.com', isPublic: false });

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('private@test.com');
  });

  test('200 — returns own profile (self-view)', async () => {
    mockAuth();
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1, username: 'authed', email: 'a@b.com', isPublic: false,
      avatar: '/avatars/default.svg', bio: '', status: 'online',
    });

    const res = await request.get('/api/users/1').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('authed');
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/users
// ────────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  test('200 — returns list of users', async () => {
    mockAuth();
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 1, username: 'user1', isPublic: true },
      { id: 2, username: 'user2', isPublic: true },
    ]);

    const res = await request.get('/api/users').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test('200 — search users', async () => {
    mockAuth();
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 1, username: 'tester', avatar: null, isOnline: true, isPublic: true },
    ]);

    const res = await request
      .get('/api/users?search=test')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
  });

  test('200 — pagination params', async () => {
    mockAuth();
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const res = await request
      .get('/api/users?limit=10&offset=20')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
  });

  test('200 — search query returns multiple results', async () => {
    mockAuth();
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 1, username: 'alpaca_lover', avatar: null, isOnline: true, isPublic: true },
      { id: 2, username: 'alpaca_fan', avatar: null, isOnline: false, isPublic: true },
      { id: 3, username: 'alpaca_hero', avatar: null, isOnline: true, isPublic: true },
    ]);

    const res = await request
      .get('/api/users?search=alpaca')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
  });
});
