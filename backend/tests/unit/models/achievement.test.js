/**
 * Achievement Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  achievement: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  userAchievement: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  dailyChallenge: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { default: Achievement } = await import('../../../src/models/Achievement.js');

beforeEach(() => jest.clearAllMocks());

// ── getAll ───────────────────────────────────────────────────────────────────
describe('getAll', () => {
  test('returns all achievements ordered by id', async () => {
    const achievements = [
      { id: 1, key: 'first_win', name: 'First Win' },
      { id: 2, key: 'ten_wins', name: 'Ten Wins' },
    ];
    mockPrisma.achievement.findMany.mockResolvedValue(achievements);
    const result = await Achievement.getAll();
    expect(mockPrisma.achievement.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    expect(result).toEqual(achievements);
  });

  test('returns empty array when no achievements', async () => {
    mockPrisma.achievement.findMany.mockResolvedValue([]);
    const result = await Achievement.getAll();
    expect(result).toEqual([]);
  });
});

// ── getUserAchievements ──────────────────────────────────────────────────────
describe('getUserAchievements', () => {
  test('returns shaped user achievements', async () => {
    mockPrisma.userAchievement.findMany.mockResolvedValue([
      { achievement: { id: 1, key: 'first_win', name: 'First Win' }, unlockedAt: '2024-01-01' },
      { achievement: { id: 2, key: 'ten_wins', name: 'Ten Wins' }, unlockedAt: '2024-02-01' },
    ]);
    const result = await Achievement.getUserAchievements(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, key: 'first_win', name: 'First Win', unlockedAt: '2024-01-01' });
  });

  test('returns empty array when no achievements unlocked', async () => {
    mockPrisma.userAchievement.findMany.mockResolvedValue([]);
    const result = await Achievement.getUserAchievements(1);
    expect(result).toEqual([]);
  });

  test('converts userId to number', async () => {
    mockPrisma.userAchievement.findMany.mockResolvedValue([]);
    await Achievement.getUserAchievements('5');
    expect(mockPrisma.userAchievement.findMany).toHaveBeenCalledWith({
      where: { userId: 5 },
      include: { achievement: true },
    });
  });
});

// ── unlock ───────────────────────────────────────────────────────────────────
describe('unlock', () => {
  test('unlocks achievement successfully', async () => {
    const achievement = { id: 1, key: 'first_win', name: 'First Win' };
    mockPrisma.achievement.findUnique.mockResolvedValue(achievement);
    mockPrisma.userAchievement.findUnique.mockResolvedValue(null);
    mockPrisma.userAchievement.create.mockResolvedValue({});
    const result = await Achievement.unlock(1, 'first_win');
    expect(mockPrisma.achievement.findUnique).toHaveBeenCalledWith({ where: { key: 'first_win' } });
    expect(mockPrisma.userAchievement.findUnique).toHaveBeenCalledWith({
      where: { userId_achievementId: { userId: 1, achievementId: 1 } },
    });
    expect(mockPrisma.userAchievement.create).toHaveBeenCalledWith({
      data: { userId: 1, achievementId: 1 },
    });
    expect(result).toEqual({ achievement });
  });

  test('returns null when achievement key not found', async () => {
    mockPrisma.achievement.findUnique.mockResolvedValue(null);
    const result = await Achievement.unlock(1, 'nonexistent');
    expect(result).toBeNull();
    expect(mockPrisma.userAchievement.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.userAchievement.create).not.toHaveBeenCalled();
  });

  test('returns null when achievement already unlocked', async () => {
    const achievement = { id: 1, key: 'first_win' };
    mockPrisma.achievement.findUnique.mockResolvedValue(achievement);
    mockPrisma.userAchievement.findUnique.mockResolvedValue({ userId: 1, achievementId: 1 });
    const result = await Achievement.unlock(1, 'first_win');
    expect(result).toBeNull();
    expect(mockPrisma.userAchievement.create).not.toHaveBeenCalled();
  });

  test('rethrows database errors', async () => {
    const achievement = { id: 1, key: 'first_win' };
    mockPrisma.achievement.findUnique.mockResolvedValue(achievement);
    mockPrisma.userAchievement.findUnique.mockResolvedValue(null);
    const err = new Error('DB error');
    err.code = 'P2003';
    mockPrisma.userAchievement.create.mockRejectedValue(err);
    await expect(Achievement.unlock(1, 'first_win')).rejects.toThrow('DB error');
  });
});

// ── getUserChallengeProgress ─────────────────────────────────────────────────
describe('getUserChallengeProgress', () => {
  test('returns challenge progress with completion status', async () => {
    mockPrisma.dailyChallenge.findMany.mockResolvedValue([
      {
        id: 1, description: 'Win 3 games', activeDate: new Date(),
        userChallenges: [{ completed: true, completedAt: '2024-01-01T12:00:00Z' }],
      },
      {
        id: 2, description: 'Play 5 games', activeDate: new Date(),
        userChallenges: [],
      },
    ]);
    const result = await Achievement.getUserChallengeProgress(1);
    expect(result).toHaveLength(2);
    expect(result[0].completed).toBe(true);
    expect(result[0].completedAt).toBe('2024-01-01T12:00:00Z');
    expect(result[0].userChallenges).toBeUndefined();
    expect(result[1].completed).toBe(false);
    expect(result[1].completedAt).toBeNull();
  });

  test('returns empty when no challenges', async () => {
    mockPrisma.dailyChallenge.findMany.mockResolvedValue([]);
    const result = await Achievement.getUserChallengeProgress(1);
    expect(result).toEqual([]);
  });

  test('filters by active date >= today', async () => {
    mockPrisma.dailyChallenge.findMany.mockResolvedValue([]);
    await Achievement.getUserChallengeProgress(1);
    const call = mockPrisma.dailyChallenge.findMany.mock.calls[0][0];
    expect(call.where.activeDate.gte).toBeInstanceOf(Date);
  });
});
