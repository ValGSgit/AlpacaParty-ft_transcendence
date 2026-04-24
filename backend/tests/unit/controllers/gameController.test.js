/**
 * Game Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockGame = {
  getStats: jest.fn(),
  getMatchHistory: jest.fn(),
  getLeaderboard: jest.fn(),
  getFarm: jest.fn(),
  updateFarm: jest.fn(),
};
const mockAchievement = {
  getAll: jest.fn(),
  getUserAchievements: jest.fn(),
  getUserChallengeProgress: jest.fn(),
};

jest.unstable_mockModule('../../../src/models/Game.js', () => ({ default: mockGame }));
jest.unstable_mockModule('../../../src/models/Achievement.js', () => ({ default: mockAchievement }));

const {
  getStats, getHistory, getLeaderboard, getFarm, saveFarm, getAchievements, getChallenges,
} = await import('../../../src/controllers/gameController.js');

function createReqRes(overrides = {}) {
  const req = { user: { id: 1, username: 'tester'}, params: {}, query: {}, body: {}, ...overrides };
  const res = {
    _status: 200, _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => jest.clearAllMocks());

// ── getStats ─────────────────────────────────────────────────────────────────
describe('getStats', () => {
  test('returns stats with default gameType', async () => {
    const stats = { userId: 1, gameType: 'spit_royale', wins: 10, losses: 5, draws: 2, elo: 1200 };
    mockGame.getStats.mockResolvedValue(stats);
    const { req, res, next } = createReqRes();
    await getStats(req, res, next);
    expect(mockGame.getStats).toHaveBeenCalledWith(1, 'spit_royale');
    expect(res._json.stats).toEqual(stats);
  });

  test('passes custom gameType', async () => {
    mockGame.getStats.mockResolvedValue({});
    const { req, res, next } = createReqRes({ query: { gameType: 'chess' } });
    await getStats(req, res, next);
    expect(mockGame.getStats).toHaveBeenCalledWith(1, 'chess');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.getStats.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getStats(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getHistory ───────────────────────────────────────────────────────────────
describe('getHistory', () => {
  test('returns match history with defaults', async () => {
    const matches = [{ id: 1, player1Id: 1, player2Id: 2 }];
    mockGame.getMatchHistory.mockResolvedValue(matches);
    const { req, res, next } = createReqRes();
    await getHistory(req, res, next);
    expect(mockGame.getMatchHistory).toHaveBeenCalledWith(1, { limit: 20, offset: 0, gameType: undefined });
    expect(res._json.history).toEqual(matches);
  });

  test('passes custom pagination and gameType', async () => {
    mockGame.getMatchHistory.mockResolvedValue([]);
    const { req, res, next } = createReqRes({ query: { gameType: 'spit_royale', limit: '5', offset: '10' } });
    await getHistory(req, res, next);
    expect(mockGame.getMatchHistory).toHaveBeenCalledWith(1, { limit: 5, offset: 10, gameType: 'spit_royale' });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.getMatchHistory.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getHistory(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getLeaderboard ───────────────────────────────────────────────────────────
describe('getLeaderboard', () => {
  test('returns leaderboard with defaults', async () => {
    const lb = [{ userId: 1, elo: 1200 }];
    mockGame.getLeaderboard.mockResolvedValue(lb);
    const { req, res, next } = createReqRes();
    await getLeaderboard(req, res, next);
    expect(mockGame.getLeaderboard).toHaveBeenCalledWith('spit_royale', { limit: 20, offset: 0 });
    expect(res._json.leaderboard).toEqual(lb);
  });

  test('passes custom gameType and pagination', async () => {
    mockGame.getLeaderboard.mockResolvedValue([]);
    const { req, res, next } = createReqRes({ query: { gameType: 'chess', limit: '5', offset: '10' } });
    await getLeaderboard(req, res, next);
    expect(mockGame.getLeaderboard).toHaveBeenCalledWith('chess', { limit: 5, offset: 10 });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.getLeaderboard.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getLeaderboard(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getFarm ──────────────────────────────────────────────────────────────────
describe('getFarm', () => {
  test('returns farm data', async () => {
    const farm = { userId: 1, farmData: { alpacas: 3 } };
    mockGame.getFarm.mockResolvedValue(farm);
    const { req, res, next } = createReqRes();
    await getFarm(req, res, next);
    expect(mockGame.getFarm).toHaveBeenCalledWith(1);
    expect(res._json.farm).toEqual(farm);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.getFarm.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getFarm(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── saveFarm ─────────────────────────────────────────────────────────────────
describe('saveFarm', () => {
  test('saves farm data successfully', async () => {
    const farm = { userId: 1, farmData: { alpacas: 5 } };
    mockGame.updateFarm.mockResolvedValue(farm);
    const { req, res, next } = createReqRes({ body: { farmData: { alpacas: 5 } } });
    await saveFarm(req, res, next);
    expect(mockGame.updateFarm).toHaveBeenCalledWith(1, { alpacas: 5 });
    expect(res._json.farm).toEqual(farm);
  });

  test('returns 400 when farmData is missing', async () => {
    const { req, res, next } = createReqRes({ body: {} });
    await saveFarm(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('farmData is required');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.updateFarm.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ body: { farmData: {} } });
    await saveFarm(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getAchievements ──────────────────────────────────────────────────────────
describe('getAchievements', () => {
  test('returns achievements with unlocked status', async () => {
    mockAchievement.getAll.mockResolvedValue([
      { id: 1, key: 'first_win', name: 'First Win' },
      { id: 2, key: 'ten_wins', name: 'Ten Wins' },
    ]);
    mockAchievement.getUserAchievements.mockResolvedValue([
      { key: 'first_win', unlockedAt: '2024-01-01' },
    ]);
    const { req, res, next } = createReqRes();
    await getAchievements(req, res, next);
    expect(res._json.achievements).toHaveLength(2);
    expect(res._json.achievements[0].unlocked).toBe(true);
    expect(res._json.achievements[1].unlocked).toBe(false);
  });

  test('all locked when no achievements unlocked', async () => {
    mockAchievement.getAll.mockResolvedValue([
      { id: 1, key: 'first_win', name: 'First Win' },
    ]);
    mockAchievement.getUserAchievements.mockResolvedValue([]);
    const { req, res, next } = createReqRes();
    await getAchievements(req, res, next);
    expect(res._json.achievements[0].unlocked).toBe(false);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockAchievement.getAll.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getAchievements(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getChallenges ────────────────────────────────────────────────────────────
describe('getChallenges', () => {
  test('returns challenge progress', async () => {
    const challenges = [{ id: 1, description: 'Win 3 games', completed: false }];
    mockAchievement.getUserChallengeProgress.mockResolvedValue(challenges);
    const { req, res, next } = createReqRes();
    await getChallenges(req, res, next);
    expect(mockAchievement.getUserChallengeProgress).toHaveBeenCalledWith(1);
    expect(res._json.challenges).toEqual(challenges);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockAchievement.getUserChallengeProgress.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getChallenges(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
