/**
 * Game Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  game: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  gameStat: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  alpacaFarm: {
    upsert: jest.fn(),
  },
};

jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { default: Game } = await import('../../../src/models/Game.js');

beforeEach(() => jest.clearAllMocks());

// ── create ───────────────────────────────────────────────────────────────────
describe('create', () => {
  test('creates a game with default gameType', async () => {
    const game = { id: 1, player1Id: 1, gameType: 'spit_royale', status: 'waiting' };
    mockPrisma.game.create.mockResolvedValue(game);
    const result = await Game.create({ player1Id: 1 });
    expect(mockPrisma.game.create).toHaveBeenCalledWith({
      data: { player1Id: 1, gameType: 'spit_royale', status: 'waiting' },
    });
    expect(result).toEqual(game);
  });

  test('creates a game with custom gameType', async () => {
    mockPrisma.game.create.mockResolvedValue({ id: 1 });
    await Game.create({ player1Id: 1, gameType: 'chess' });
    expect(mockPrisma.game.create).toHaveBeenCalledWith({
      data: { player1Id: 1, gameType: 'chess', status: 'waiting' },
    });
  });
});

// ── findById ─────────────────────────────────────────────────────────────────
describe('findById', () => {
  test('finds game by id', async () => {
    const game = { id: 1, status: 'playing' };
    mockPrisma.game.findUnique.mockResolvedValue(game);
    const result = await Game.findById(1);
    expect(mockPrisma.game.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(game);
  });

  test('returns null when not found', async () => {
    mockPrisma.game.findUnique.mockResolvedValue(null);
    const result = await Game.findById(999);
    expect(result).toBeNull();
  });
});

// ── findWaiting ──────────────────────────────────────────────────────────────
describe('findWaiting', () => {
  test('finds waiting game excluding player', async () => {
    const game = { id: 1, player1Id: 2, status: 'waiting' };
    mockPrisma.game.findFirst.mockResolvedValue(game);
    const result = await Game.findWaiting('spit_royale', 1);
    expect(mockPrisma.game.findFirst).toHaveBeenCalledWith({
      where: {
        status: 'waiting', gameType: 'spit_royale', player1Id: { not: 1 }, player2Id: null,
      },
    });
    expect(result).toEqual(game);
  });

  test('returns null when no waiting game', async () => {
    mockPrisma.game.findFirst.mockResolvedValue(null);
    const result = await Game.findWaiting('spit_royale', 1);
    expect(result).toBeNull();
  });
});

// ── joinGame ─────────────────────────────────────────────────────────────────
describe('joinGame', () => {
  test('updates game with player2 and sets playing', async () => {
    const game = { id: 1, player2Id: 2, status: 'playing' };
    mockPrisma.game.update.mockResolvedValue(game);
    const result = await Game.joinGame(1, 2);
    expect(mockPrisma.game.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ player2Id: 2, status: 'playing' }),
    });
    expect(result).toEqual(game);
  });

  test('sets startedAt timestamp', async () => {
    mockPrisma.game.update.mockResolvedValue({});
    await Game.joinGame(1, 2);
    const call = mockPrisma.game.update.mock.calls[0][0];
    expect(call.data.startedAt).toBeInstanceOf(Date);
  });
});

// ── finishGame ───────────────────────────────────────────────────────────────
describe('finishGame', () => {
  test('finishes game with winner and scores', async () => {
    const game = { id: 1, status: 'finished', winnerId: 1 };
    mockPrisma.game.update.mockResolvedValue(game);
    const result = await Game.finishGame(1, { winnerId: 1, player1Score: 11, player2Score: 5 });
    expect(mockPrisma.game.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'finished', winnerId: 1, player1Score: 11, player2Score: 5,
      }),
    });
    expect(result).toEqual(game);
  });

  test('handles draw (no winner)', async () => {
    mockPrisma.game.update.mockResolvedValue({});
    await Game.finishGame(1, { winnerId: null, player1Score: 5, player2Score: 5 });
    const call = mockPrisma.game.update.mock.calls[0][0];
    expect(call.data.winnerId).toBeNull();
  });

  test('defaults scores to 0', async () => {
    mockPrisma.game.update.mockResolvedValue({});
    await Game.finishGame(1, { winnerId: 1 });
    const call = mockPrisma.game.update.mock.calls[0][0];
    expect(call.data.player1Score).toBe(0);
    expect(call.data.player2Score).toBe(0);
  });

  test('sets finishedAt timestamp', async () => {
    mockPrisma.game.update.mockResolvedValue({});
    await Game.finishGame(1, { winnerId: 1 });
    const call = mockPrisma.game.update.mock.calls[0][0];
    expect(call.data.finishedAt).toBeInstanceOf(Date);
  });
});

// ── cancelGame ───────────────────────────────────────────────────────────────
describe('cancelGame', () => {
  test('sets game status to cancelled', async () => {
    mockPrisma.game.update.mockResolvedValue({ id: 1, status: 'cancelled' });
    const result = await Game.cancelGame(1);
    expect(mockPrisma.game.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { status: 'cancelled' },
    });
    expect(result.status).toBe('cancelled');
  });
});

// ── getMatchHistory ──────────────────────────────────────────────────────────
describe('getMatchHistory', () => {
  test('returns finished games for user', async () => {
    const matches = [{ id: 1, player1Id: 1, status: 'finished' }];
    mockPrisma.game.findMany.mockResolvedValue(matches);
    const result = await Game.getMatchHistory(1);
    expect(mockPrisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ player1Id: 1 }, { player2Id: 1 }],
          status: 'finished',
        }),
        take: 20, skip: 0,
      }),
    );
    expect(result).toEqual(matches);
  });

  test('applies pagination and gameType filter', async () => {
    mockPrisma.game.findMany.mockResolvedValue([]);
    await Game.getMatchHistory(1, { limit: 5, offset: 10, gameType: 'chess' });
    expect(mockPrisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gameType: 'chess' }),
        take: 5, skip: 10,
      }),
    );
  });

  test('does not include gameType filter when not provided', async () => {
    mockPrisma.game.findMany.mockResolvedValue([]);
    await Game.getMatchHistory(1, {});
    const call = mockPrisma.game.findMany.mock.calls[0][0];
    expect(call.where.gameType).toBeUndefined();
  });
});

// ── getStats ─────────────────────────────────────────────────────────────────
describe('getStats', () => {
  test('returns existing stats', async () => {
    const stat = { userId: 1, gameType: 'spit_royale', wins: 5, losses: 3, draws: 1, elo: 1100 };
    mockPrisma.gameStat.findUnique.mockResolvedValue(stat);
    const result = await Game.getStats(1, 'spit_royale');
    expect(result).toEqual(stat);
  });

  test('returns default stats when none exist', async () => {
    mockPrisma.gameStat.findUnique.mockResolvedValue(null);
    const result = await Game.getStats(1, 'spit_royale');
    expect(result).toEqual({ userId: 1, gameType: 'spit_royale', wins: 0, losses: 0, draws: 0, elo: 1000 });
  });

  test('defaults gameType to spit_royale', async () => {
    mockPrisma.gameStat.findUnique.mockResolvedValue(null);
    await Game.getStats(1);
    expect(mockPrisma.gameStat.findUnique).toHaveBeenCalledWith({
      where: { userId_gameType: { userId: 1, gameType: 'spit_royale' } },
    });
  });
});

// ── updateStats ──────────────────────────────────────────────────────────────
describe('updateStats', () => {
  test('increments wins on win', async () => {
    mockPrisma.gameStat.upsert.mockResolvedValue({});
    await Game.updateStats(1, 'spit_royale', 'win');
    expect(mockPrisma.gameStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { wins: { increment: 1 } },
        create: expect.objectContaining({ wins: 1, losses: 0, draws: 0 }),
      }),
    );
  });

  test('increments losses on loss', async () => {
    mockPrisma.gameStat.upsert.mockResolvedValue({});
    await Game.updateStats(1, 'spit_royale', 'loss');
    expect(mockPrisma.gameStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { losses: { increment: 1 } },
        create: expect.objectContaining({ losses: 1 }),
      }),
    );
  });

  test('increments draws on draw', async () => {
    mockPrisma.gameStat.upsert.mockResolvedValue({});
    await Game.updateStats(1, 'spit_royale', 'draw');
    expect(mockPrisma.gameStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { draws: { increment: 1 } },
        create: expect.objectContaining({ draws: 1 }),
      }),
    );
  });
});

// ── updateElo ────────────────────────────────────────────────────────────────
describe('updateElo', () => {
  test('upserts elo value', async () => {
    mockPrisma.gameStat.upsert.mockResolvedValue({});
    await Game.updateElo(1, 'spit_royale', 1300);
    expect(mockPrisma.gameStat.upsert).toHaveBeenCalledWith({
      where: { userId_gameType: { userId: 1, gameType: 'spit_royale' } },
      update: { elo: 1300 },
      create: { userId: 1, gameType: 'spit_royale', elo: 1300 },
    });
  });
});

// ── getLeaderboard ───────────────────────────────────────────────────────────
describe('getLeaderboard', () => {
  test('returns shaped leaderboard data', async () => {
    mockPrisma.gameStat.findMany.mockResolvedValue([
      { userId: 1, gameType: 'spit_royale', wins: 10, losses: 5, draws: 2, elo: 1200, user: { username: 'alice', avatar: '/a.png', level: 5 } },
    ]);
    const result = await Game.getLeaderboard('spit_royale');
    expect(result).toEqual([{
      userId: 1, gameType: 'spit_royale', wins: 10, losses: 5, draws: 2, elo: 1200,
      username: 'alice', avatar: '/a.png', level: 5,
    }]);
  });

  test('applies publicOnly filter', async () => {
    mockPrisma.gameStat.findMany.mockResolvedValue([]);
    await Game.getLeaderboard('spit_royale', { publicOnly: true });
    expect(mockPrisma.gameStat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user: { isPublic: true } }),
      }),
    );
  });

  test('does not apply publicOnly when false', async () => {
    mockPrisma.gameStat.findMany.mockResolvedValue([]);
    await Game.getLeaderboard('spit_royale', { publicOnly: false });
    const call = mockPrisma.gameStat.findMany.mock.calls[0][0];
    expect(call.where.user).toBeUndefined();
  });

  test('applies pagination', async () => {
    mockPrisma.gameStat.findMany.mockResolvedValue([]);
    await Game.getLeaderboard('spit_royale', { limit: 5, offset: 10 });
    expect(mockPrisma.gameStat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 }),
    );
  });

  test('defaults pagination', async () => {
    mockPrisma.gameStat.findMany.mockResolvedValue([]);
    await Game.getLeaderboard();
    expect(mockPrisma.gameStat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0, where: { gameType: 'spit_royale' } }),
    );
  });
});

// ── countActive ──────────────────────────────────────────────────────────────
describe('countActive', () => {
  test('counts games with playing status', async () => {
    mockPrisma.game.count.mockResolvedValue(3);
    const result = await Game.countActive();
    expect(mockPrisma.game.count).toHaveBeenCalledWith({ where: { status: 'playing' } });
    expect(result).toBe(3);
  });
});

// ── getFarm ──────────────────────────────────────────────────────────────────
describe('getFarm', () => {
  test('upserts to get or create farm', async () => {
    const farm = { userId: 1, farmData: null };
    mockPrisma.alpacaFarm.upsert.mockResolvedValue(farm);
    const result = await Game.getFarm(1);
    expect(mockPrisma.alpacaFarm.upsert).toHaveBeenCalledWith({
      where: { userId: 1 }, update: {}, create: { userId: 1 },
    });
    expect(result).toEqual(farm);
  });
});

// ── updateFarm ───────────────────────────────────────────────────────────────
describe('updateFarm', () => {
  test('upserts farm data', async () => {
    const farmData = { alpacas: 5, barn: 'upgraded' };
    mockPrisma.alpacaFarm.upsert.mockResolvedValue({ userId: 1, farmData });
    const result = await Game.updateFarm(1, farmData);
    expect(mockPrisma.alpacaFarm.upsert).toHaveBeenCalledWith({
      where: { userId: 1 },
      update: { farmData },
      create: { userId: 1, farmData },
    });
    expect(result.farmData).toEqual(farmData);
  });
});
