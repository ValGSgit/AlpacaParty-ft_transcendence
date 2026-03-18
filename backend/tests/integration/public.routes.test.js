/**
 * Public API Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

process.env.API_KEYS = 'test-api-key';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

const { createTestApp } = await import('../helpers/createApp.js');

let app;
let request;

beforeEach(async () => {
  mockQuery.mockReset();
  app = await createTestApp();
  request = supertest(app);
});

describe('GET /api/public', () => {
  test('401 — missing API key', async () => {
    const res = await request.get('/api/public');
    expect(res.status).toBe(401);
  });

  test('200 — valid API key returns docs', async () => {
    const res = await request.get('/api/public').set('X-API-Key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Public API/i);
  });
});

describe('GET /api/public/users', () => {
  test('200 — only public users and no email leakage', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, username: 'public-user', email: 'pub@test.com', is_public: true, avatar: '/a.png', bio: 'bio', status: 's', level: 1, xp: 2, is_online: false, created_at: '2026-01-01' },
        { id: 2, username: 'private-user', email: 'priv@test.com', is_public: false, avatar: '/b.png', bio: 'bio', status: 's', level: 1, xp: 2, is_online: false, created_at: '2026-01-01' },
      ],
    });

    const res = await request.get('/api/public/users').set('X-API-Key', 'test-api-key');

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('public-user');
    expect(res.body.users[0].email).toBeUndefined();
  });
});

describe('GET /api/public/mock', () => {
  test('200 — returns anonymized mock dataset with disclaimer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice', is_public: true, avatar: '/a.png', bio: '', status: '', level: 2, xp: 10, is_online: false, created_at: '2026-01-01' }] }) // users
      .mockResolvedValueOnce({ rows: [{ user_id: 1, username: 'alice', avatar: '/a.png', elo: 1000, wins: 1, losses: 0, draws: 0 }] }) // leaderboard
      .mockResolvedValueOnce({ rows: [{ id: 10, author_id: 1, author_username: 'alice', author_avatar: '/a.png', content: 'secret', created_at: '2026-01-01', likes_count: 0 }] }) // posts
      .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Alpha Org', description: 'desc' }] }); // organizations

    const res = await request.get('/api/public/mock').set('X-API-Key', 'test-api-key');

    expect(res.status).toBe(200);
    expect(res.body.disclaimer).toMatch(/not user personal data/i);
    expect(res.body.users[0].username).toMatch(/^user_/);
    expect(res.body.posts[0].content).toMatch(/anonymized/i);
    expect(res.body.organizations[0].name).toMatch(/^org_/);
  });
});
