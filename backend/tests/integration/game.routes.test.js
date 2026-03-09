/**
 * Game Routes Integration Tests
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

const authUser = { id: 1, username: 'gamer', email: 'g@test.com', is_admin: false };
const sampleStats = { id: 1, user_id: 1, game_type: 'pong', wins: 5, losses: 2, elo: 1050 };
const sampleFarm = { id: 1, user_id: 1, farm_data: { coins: 100, alpacas: [] } };

beforeEach(async () => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'gamer', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/game/stats ───────────────────────────────────────
describe('GET /api/game/stats', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/game/stats');
    expect(res.status).toBe(401);
  });

  test('200 — returns stats', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleStats] });
    const res = await request.get('/api/game/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
  });

  test('200 — with gameType query param', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleStats] });
    const res = await request
      .get('/api/game/stats?gameType=pong')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/game/history ─────────────────────────────────────
describe('GET /api/game/history', () => {
  test('200 — returns match history', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, player1_id: 1, player2_id: 2 }] });
    const res = await request.get('/api/game/history').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(1);
  });
});

// ── GET /api/game/leaderboard ─────────────────────────────────
describe('GET /api/game/leaderboard', () => {
  test('200 — returns leaderboard', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ username: 'top', elo: 1200 }] });
    const res = await request.get('/api/game/leaderboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(1);
  });
});

// ── GET /api/game/farm ────────────────────────────────────────
describe('GET /api/game/farm', () => {
  test('200 — returns farm data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleFarm] });
    const res = await request.get('/api/game/farm').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('farm');
  });
});

// ── PUT /api/game/farm ────────────────────────────────────────
describe('PUT /api/game/farm', () => {
  test('400 — missing farmData', async () => {
    const res = await auth(request.put('/api/game/farm')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/farmData/i);
  });

  test('200 — saves farm', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    const farmData = { coins: 200, alpacas: [] };
    mockQuery.mockResolvedValueOnce({ rows: [{ ...sampleFarm, farm_data: farmData }] });
    const res = await request
      .put('/api/game/farm')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmData });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('farm');
  });
});

// ── GET /api/game/achievements ────────────────────────────────
describe('GET /api/game/achievements', () => {
  test('200 — returns all achievements with unlock status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ key: 'first_win', title: 'First Win' }] }); // getAll
    mockQuery.mockResolvedValueOnce({ rows: [{ key: 'first_win' }] }); // getUserAchievements
    const res = await request.get('/api/game/achievements').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.achievements[0]).toHaveProperty('unlocked', true);
  });
});

// ── GET /api/game/challenges ──────────────────────────────────
describe('GET /api/game/challenges', () => {
  test('200 — returns challenges', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ key: 'win_10', progress: 3, target: 10 }] });
    const res = await request.get('/api/game/challenges').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('challenges');
  });
});
