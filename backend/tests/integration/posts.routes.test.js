/**
 * Post Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock prisma ──
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  post: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  postLike: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  repost: { findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'poster', email: 'p@test.com', isAdmin: false, isPublic: true };

// Prisma camelCase post with author
const samplePostPrisma = {
  id: 10, authorId: 1, content: 'Hello world', isPublic: true,
  imageUrl: null, likesCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  author: { username: 'poster', avatar: null },
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'poster', isAdmin: false });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/posts (public feed, optionalAuth) ────────────────
describe('GET /api/posts', () => {
  test('200 — returns feed without auth', async () => {
    mockPrisma.post.findMany.mockResolvedValueOnce([samplePostPrisma]);
    mockPrisma.repost.findMany.mockResolvedValueOnce([]);
    const res = await request.get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
  });

  test('200 — returns feed with auth (viewerId included)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // optionalAuth
    mockPrisma.post.findMany.mockResolvedValueOnce([samplePostPrisma]);
    mockPrisma.postLike.findMany.mockResolvedValueOnce([]); // liked posts for viewer
    mockPrisma.repost.findMany.mockResolvedValueOnce([]); // viewer reposts
    mockPrisma.repost.findMany.mockResolvedValueOnce([]); // recent reposts
    const res = await request.get('/api/posts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/posts/user/:userId ───────────────────────────────
describe('GET /api/posts/user/:userId', () => {
  test('200 — returns user posts', async () => {
    mockPrisma.post.findMany.mockResolvedValueOnce([samplePostPrisma]);
    const res = await request.get('/api/posts/user/1');
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
  });
});

// ── GET /api/posts/:id ────────────────────────────────────────
describe('GET /api/posts/:id', () => {
  test('200 — returns post by id', async () => {
    mockPrisma.post.findUnique.mockResolvedValueOnce(samplePostPrisma);
    const res = await request.get('/api/posts/10');
    expect(res.status).toBe(200);
    expect(res.body.post.id).toBe(10);
  });

  test('404 — post not found', async () => {
    mockPrisma.post.findUnique.mockResolvedValueOnce(null);
    const res = await request.get('/api/posts/999');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/posts ───────────────────────────────────────────
describe('POST /api/posts', () => {
  test('400 — missing content', async () => {
    const res = await auth(request.post('/api/posts')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/content/i);
  });

  test('400 — empty content', async () => {
    const res = await auth(request.post('/api/posts')).send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  test('201 — creates post', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // authenticate
    mockPrisma.post.create.mockResolvedValueOnce({ ...samplePostPrisma, content: 'New post' });
    // checkPostAchievements → tryUnlock('first_post') → achievement not found → null
    mockPrisma.achievement.findUnique.mockResolvedValueOnce(null);
    // awardXp → User.addXp → user.update (xp increment)
    mockPrisma.user.update.mockResolvedValueOnce({ id: 1, xp: 10, level: 1 });
    // addXp: newLevel === level → calls findById
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);

    const res = await request
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'New post' });

    expect(res.status).toBe(201);
    expect(res.body.post.content).toBe('New post');
  });
});

// ── PUT /api/posts/:id ────────────────────────────────────────
describe('PUT /api/posts/:id', () => {
  test('404 — post not found or not yours', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Post.update uses .catch(() => null), so rejecting returns null → 404
    mockPrisma.post.update.mockRejectedValueOnce(new Error('record not found'));

    const res = await request
      .put('/api/posts/99')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated' });

    expect(res.status).toBe(404);
  });

  test('200 — updates post', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.post.update.mockResolvedValueOnce({ ...samplePostPrisma, content: 'Updated' });

    const res = await request
      .put('/api/posts/10')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe('Updated');
  });
});

// ── DELETE /api/posts/:id ─────────────────────────────────────
describe('DELETE /api/posts/:id', () => {
  test('200 — deletes post', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Post.delete → post.deleteMany → { count: 1 } → returns true
    mockPrisma.post.deleteMany.mockResolvedValueOnce({ count: 1 });

    const res = await request
      .delete('/api/posts/10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── POST /api/posts/:id/like ──────────────────────────────────
describe('POST /api/posts/:id/like', () => {
  test('404 — post not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.post.findUnique.mockResolvedValueOnce(null);

    const res = await request
      .post('/api/posts/999/like')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('200 — likes post', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    // Post.findById — authorId 2 (not our user), so notification fires (fire-and-forget)
    mockPrisma.post.findUnique.mockResolvedValueOnce({ ...samplePostPrisma, authorId: 2 });
    // Post.like → $transaction(async tx => { postLike.create, postLike.count, post.update })
    // Default jest.fn() returns suffice for tx internals

    const res = await request
      .post('/api/posts/10/like')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/liked/i);
  });
});

// ── DELETE /api/posts/:id/like ────────────────────────────────
describe('DELETE /api/posts/:id/like', () => {
  test('200 — unlikes post', async () => {
    // Post.unlike → $transaction(async tx => { postLike.deleteMany, post.update })
    mockPrisma.postLike.deleteMany.mockResolvedValueOnce({ count: 0 });
    const res = await auth(request.delete('/api/posts/10/like'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unliked/i);
  });
});
