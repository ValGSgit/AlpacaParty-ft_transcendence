/**
 * Public API Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

process.env.API_KEYS = 'test-api-key';

const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  post: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  postLike: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  gameStat: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  organization: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  organizationMember: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  repost: { findMany: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');

let app;
let request;

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
});

describe('GET /api/public', () => {
  test('200 — docs endpoint is publicly accessible without API key', async () => {
    const res = await request.get('/api/public');
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Public API/i);
  });

  test('200 — valid API key also returns docs', async () => {
    const res = await request.get('/api/public').set('X-API-Key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Public API/i);
  });
});

describe('GET /api/public/users', () => {
  test('200 — only public users and no email leakage', async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 1, username: 'public-user', isPublic: true, avatar: '/a.png', bio: 'bio', status: 's', level: 1, xp: 2, isOnline: false, createdAt: '2026-01-01' },
      { id: 2, username: 'private-user', isPublic: false, avatar: '/b.png', bio: 'bio', status: 's', level: 1, xp: 2, isOnline: false, createdAt: '2026-01-01' },
    ]);

    const res = await request.get('/api/public/users').set('X-API-Key', 'test-api-key');

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('public-user');
    expect(res.body.users[0].email).toBeUndefined();
  });
});

// ── POST /api/public/posts ────────────────────────────────────
describe('POST /api/public/posts', () => {
  test('401 — requires API key', async () => {
    const res = await request.post('/api/public/posts').send({ content: 'test', authorId: 1 });
    expect(res.status).toBe(401);
  });

  test('400 — requires content', async () => {
    const res = await request.post('/api/public/posts')
      .set('X-API-Key', 'test-api-key')
      .send({ authorId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/content/i);
  });

  test('400 — requires authorId', async () => {
    const res = await request.post('/api/public/posts')
      .set('X-API-Key', 'test-api-key')
      .send({ content: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/authorId/i);
  });
});

// ── PUT /api/public/posts/:id ─────────────────────────────────
describe('PUT /api/public/posts/:id', () => {
  test('401 — requires API key', async () => {
    const res = await request.put('/api/public/posts/1').send({ content: 'updated' });
    expect(res.status).toBe(401);
  });

  test('400 — requires at least one field to update', async () => {
    const res = await request.put('/api/public/posts/1')
      .set('X-API-Key', 'test-api-key')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/nothing to update/i);
  });
});

// ── DELETE /api/public/posts/:id ──────────────────────────────
describe('DELETE /api/public/posts/:id', () => {
  test('401 — requires API key', async () => {
    const res = await request.delete('/api/public/posts/1');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/public/mock', () => {
  test('200 — returns anonymized mock dataset with disclaimer', async () => {
    // User.findAll → prisma.user.findMany
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 1, username: 'alice', isPublic: true, avatar: '/a.png', bio: '', status: '', level: 2, xp: 10, isOnline: false, createdAt: '2026-01-01' },
    ]);
    // Game.getLeaderboard → prisma.gameStat.findMany
    mockPrisma.gameStat.findMany.mockResolvedValueOnce([
      { userId: 1, gameType: 'spit_royale', elo: 1000, wins: 1, losses: 0, draws: 0, user: { username: 'alice', avatar: '/a.png', level: 2 } },
    ]);
    // Post.getFeed → prisma.post.findMany (postLike not called since viewerId=null)
    mockPrisma.post.findMany.mockResolvedValueOnce([
      { id: 10, authorId: 1, content: 'secret', imageUrl: null, isPublic: true, likesCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01', author: { username: 'alice', avatar: '/a.png' } },
    ]);
    mockPrisma.repost.findMany.mockResolvedValueOnce([]); // recent reposts
    // Organization.findAll → prisma.organization.findMany
    mockPrisma.organization.findMany.mockResolvedValueOnce([
      { id: 3, name: 'Alpha Org', description: 'desc', _count: { members: 1 } },
    ]);

    const res = await request.get('/api/public/mock').set('X-API-Key', 'test-api-key');

    expect(res.status).toBe(200);
    expect(res.body.disclaimer).toMatch(/not user personal data/i);
    expect(res.body.users[0].username).toMatch(/^user_/);
    expect(res.body.posts[0].content).toMatch(/anonymized/i);
    expect(res.body.organizations[0].name).toMatch(/^org_/);
  });
});
