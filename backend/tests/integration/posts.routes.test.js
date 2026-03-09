/**
 * Post Routes Integration Tests
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

const authUser = { id: 1, username: 'poster', email: 'p@test.com', is_admin: false };
const samplePost = { id: 10, author_id: 1, content: 'Hello world', is_public: true };

beforeEach(async () => {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockClient.query.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'poster', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/posts (public feed, optionalAuth) ────────────────
describe('GET /api/posts', () => {
  test('200 — returns feed without auth', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [samplePost] });
    const res = await request.get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
  });

  test('200 — returns feed with auth', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // optionalAuth
    mockQuery.mockResolvedValueOnce({ rows: [samplePost] });
    const res = await request.get('/api/posts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/posts/user/:userId ───────────────────────────────
describe('GET /api/posts/user/:userId', () => {
  test('200 — returns user posts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [samplePost] });
    const res = await request.get('/api/posts/user/1');
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
  });
});

// ── GET /api/posts/:id ────────────────────────────────────────
describe('GET /api/posts/:id', () => {
  test('200 — returns post by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [samplePost] });
    const res = await request.get('/api/posts/10');
    expect(res.status).toBe(200);
    expect(res.body.post.id).toBe(10);
  });

  test('404 — post not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
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
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ ...samplePost, content: 'New post' }] }); // Post.create
    // GamificationService.checkPostAchievements: Achievement.unlock → empty (fine), then User.addXp needs a user
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Achievement.unlock → rows[0]=undefined → tryUnlock returns null
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, level: 1, xp: 10 }] }); // User.addXp
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
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // update returns nothing
    const res = await request
      .put('/api/posts/99')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated' });
    expect(res.status).toBe(404);
  });

  test('200 — updates post', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...samplePost, content: 'Updated' }] });
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
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Post.delete uses rowCount, not rows
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
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findById → not found
    const res = await request
      .post('/api/posts/999/like')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — likes post', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ ...samplePost, author_id: 2 }] }); // Post.findById
    // Post.like uses getClient transaction — mockClient handles BEGIN/INSERT/UPDATE/COMMIT
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
    const res = await auth(request.delete('/api/posts/10/like'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unliked/i);
  });
});
