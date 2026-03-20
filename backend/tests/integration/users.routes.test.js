/**
 * User Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock database ──
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
let validToken;

const authUser = { id: 1, username: 'authed', email: 'a@b.com', avatar: '/avatars/default.svg', bio: '', status: 'online', is_online: true, is_admin: false };
const adminUser = { ...authUser, id: 99, username: 'admin', email: 'admin@test.com', is_admin: true };

beforeEach(async () => {
  mockQuery.mockReset();
  app = await createTestApp();
  request = supertest(app);
  validToken = AuthService.generateAccessToken({ id: 1, username: 'authed', is_admin: false });
});

/** Helper: mock the authenticate middleware's findById call */
function mockAuth() {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
}

function mockAdminAuth() {
  mockQuery.mockResolvedValueOnce({ rows: [adminUser] });
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
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logout).toBe(true);
  });

  test('404 — returns not found when user is already deleted', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`);

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
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...authUser, bio: 'New bio' }],
    });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ bio: 'New bio' });

    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('New bio');
  });

  test('200 — update username (available)', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByUsername → available
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, username: 'newname' }] }); // update

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
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 99, username: 'taken' }] }); // findByUsername → exists

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ username: 'taken' });

    expect(res.status).toBe(409);
  });

  test('409 — email taken', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 99, email: 'taken@x.com' }] }); // findByEmail → exists

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'taken@x.com' });

    expect(res.status).toBe(409);
  });

  test('200 — empty body returns current user', async () => {
    mockAuth();
    // User.update with no sets → calls findById
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
  });

  test('200 — update email (available)', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByEmail → available
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, email: 'new@email.com' }] }); // update

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'new@email.com' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@email.com');
  });

  test('200 — update status', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, status: 'Away' }] });

    const res = await request
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'Away' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('Away');
  });

  test('200 — update coins', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, coins: 500 }] });

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
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, password_hash: currentHash }] }); // findByIdWithPassword
    mockQuery.mockResolvedValueOnce({ rows: [] }); // updatePassword

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
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, password_hash: hash }] });

    const res = await request
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass1' });

    expect(res.status).toBe(401);
  });

  test('400 — new password too weak', async () => {
    const hash = await AuthService.hashPassword('OldPass1');
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser, password_hash: hash }] });

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
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, username: 'other', bio: 'hi', is_public: true }] });

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('other');
  });

  test('404 — user not found', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request.get('/api/users/999').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });

  test('403 — private profile blocked for non-friends', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, username: 'private', is_public: false }] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Friend.areFriends

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  test('200 — private profile visible to friends (email redacted)', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, username: 'private', email: 'private@test.com', is_public: false, avatar: '/a.png', bio: 'x', status: 's', is_online: false, xp: 10, level: 1, last_seen: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // Friend.areFriends

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.username).toBe('private');
  });

  test('200 — private profile visible to admins', async () => {
    const adminToken = AuthService.generateAccessToken({ id: 99, username: 'admin', is_admin: true });
    mockAdminAuth();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, username: 'private', email: 'private@test.com', is_public: false }] });

    const res = await request.get('/api/users/2').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('private@test.com');
  });

  test('200 — returns own profile (self-view)', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'authed', email: 'a@b.com', is_public: false, avatar: '/avatars/default.svg', bio: '', status: 'online' }],
    });

    const res = await request.get('/api/users/1').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    // Self-view should succeed even for private profiles
    expect(res.body.user.username).toBe('authed');
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/users
// ────────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  test('200 — returns list of users', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, username: 'user1', is_public: true },
        { id: 2, username: 'user2', is_public: true },
      ],
    });

    const res = await request.get('/api/users').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test('200 — search users', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'tester', avatar: null, is_online: true }],
    });

    const res = await request
      .get('/api/users?search=test')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
  });

  test('200 — pagination params', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request
      .get('/api/users?limit=10&offset=20')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
  });

  test('200 — search query returns multiple results', async () => {
    mockAuth();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, username: 'alpaca_lover', avatar: null, is_online: true, is_public: true },
        { id: 2, username: 'alpaca_fan', avatar: null, is_online: false, is_public: true },
        { id: 3, username: 'alpaca_hero', avatar: null, is_online: true, is_public: true },
      ],
    });

    const res = await request
      .get('/api/users?search=alpaca')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
  });
});
