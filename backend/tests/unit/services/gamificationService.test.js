/**
 * GamificationService Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock prisma (needed by models)
const mockPrisma = {
  user: { update: jest.fn(), findUnique: jest.fn() },
  achievement: { findUnique: jest.fn() },
  userAchievement: { create: jest.fn() },
  friend: { count: jest.fn() },
};
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

// Mock User model
const mockUser = { addXp: jest.fn() };
jest.unstable_mockModule('../../../src/models/User.js', () => ({ default: mockUser }));

// Mock Achievement model
const mockAchievement = { unlock: jest.fn() };
jest.unstable_mockModule('../../../src/models/Achievement.js', () => ({ default: mockAchievement }));

// Mock Friend model
const mockFriend = { count: jest.fn() };
jest.unstable_mockModule('../../../src/models/Friend.js', () => ({ default: mockFriend }));

// Mock NotificationService
const mockNotificationService = { achievementUnlocked: jest.fn() };
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({ default: mockNotificationService }));

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  default: {
    xp: { perWin: 25, perLoss: 5, perDraw: 10, perPost: 5, levelThreshold: 100 },
  },
}));

const { default: GamificationService } = await import('../../../src/services/gamificationService.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GamificationService.awardXp', () => {
  test('should call User.addXp with userId and amount', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 50, level: 1 });
    const result = await GamificationService.awardXp(1, 25);
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 25);
    expect(result).toEqual({ id: 1, xp: 50, level: 1 });
  });

  test('should try to unlock level_10 when user reaches level 10', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 1000, level: 10 });
    mockAchievement.unlock.mockResolvedValue(null);
    await GamificationService.awardXp(1, 25);
    expect(mockAchievement.unlock).toHaveBeenCalledWith(1, 'level_10');
  });

  test('should not try level_10 unlock when user is below level 10', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 50, level: 3 });
    await GamificationService.awardXp(1, 25);
    expect(mockAchievement.unlock).not.toHaveBeenCalled();
  });
});

describe('GamificationService.processGameEnd', () => {
  test('should award perWin XP for a win', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 25, level: 1 });
    mockAchievement.unlock.mockResolvedValue(null);
    await GamificationService.processGameEnd(1, 'win');
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 25);
    expect(mockAchievement.unlock).toHaveBeenCalledWith(1, 'first_win');
  });

  test('should award perLoss XP for a loss', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 5, level: 1 });
    await GamificationService.processGameEnd(1, 'loss');
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 5);
  });

  test('should award perDraw XP for a draw', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 10, level: 1 });
    await GamificationService.processGameEnd(1, 'draw');
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 10);
  });

  test('should not try first_win unlock on a loss', async () => {
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 5, level: 1 });
    await GamificationService.processGameEnd(1, 'loss');
    expect(mockAchievement.unlock).not.toHaveBeenCalled();
  });
});

describe('GamificationService.tryUnlock', () => {
  test('should notify and award XP when achievement is newly unlocked', async () => {
    mockAchievement.unlock.mockResolvedValue({ achievement: { name: 'First Win', xpReward: 50 } });
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 75, level: 1 });
    mockNotificationService.achievementUnlocked.mockResolvedValue({});
    const result = await GamificationService.tryUnlock(1, 'first_win');
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 50);
    expect(mockNotificationService.achievementUnlocked).toHaveBeenCalledWith(1, 'First Win');
    expect(result).toEqual({ achievement: { name: 'First Win', xpReward: 50 } });
  });

  test('should not notify or award XP when achievement was already unlocked', async () => {
    mockAchievement.unlock.mockResolvedValue(null);
    const result = await GamificationService.tryUnlock(1, 'first_win');
    expect(mockUser.addXp).not.toHaveBeenCalled();
    expect(mockNotificationService.achievementUnlocked).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should skip XP award when xpReward is 0', async () => {
    mockAchievement.unlock.mockResolvedValue({ achievement: { name: 'Social Butterfly', xpReward: 0 } });
    mockNotificationService.achievementUnlocked.mockResolvedValue({});
    await GamificationService.tryUnlock(1, 'social_butter');
    expect(mockUser.addXp).not.toHaveBeenCalled();
    expect(mockNotificationService.achievementUnlocked).toHaveBeenCalled();
  });
});

describe('GamificationService.checkSocialAchievements', () => {
  test('should try to unlock social_butter when user has 10+ friends', async () => {
    mockFriend.count.mockResolvedValue(10);
    mockAchievement.unlock.mockResolvedValue(null);
    await GamificationService.checkSocialAchievements(1);
    expect(mockFriend.count).toHaveBeenCalledWith(1);
    expect(mockAchievement.unlock).toHaveBeenCalledWith(1, 'social_butter');
  });

  test('should not unlock social_butter when user has fewer than 10 friends', async () => {
    mockFriend.count.mockResolvedValue(5);
    await GamificationService.checkSocialAchievements(1);
    expect(mockAchievement.unlock).not.toHaveBeenCalled();
  });
});

describe('GamificationService.checkPostAchievements', () => {
  test('should unlock first_post and award post XP', async () => {
    mockAchievement.unlock.mockResolvedValue(null);
    mockUser.addXp.mockResolvedValue({ id: 1, xp: 5, level: 1 });
    await GamificationService.checkPostAchievements(1);
    expect(mockAchievement.unlock).toHaveBeenCalledWith(1, 'first_post');
    expect(mockUser.addXp).toHaveBeenCalledWith(1, 5);
  });
});

describe('GamificationService.checkOrgAchievements', () => {
  test('should unlock org_founder achievement', async () => {
    mockAchievement.unlock.mockResolvedValue(null);
    await GamificationService.checkOrgAchievements(1);
    expect(mockAchievement.unlock).toHaveBeenCalledWith(1, 'org_founder');
  });
});
