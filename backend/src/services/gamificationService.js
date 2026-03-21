/**
 * Gamification Service — XP, leveling, achievement checks
 * @owner ValGSgit
 */
import config from '../config/index.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import Friend from '../models/Friend.js';
import Game from '../models/Game.js';
import NotificationService from './notificationService.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function baseXpForResult(result) {
  if (result === 'win') return config.xp.perWin;
  if (result === 'loss') return config.xp.perLoss;
  return config.xp.perDraw;
}

function calculatePerformanceBonus(context = {}, result = 'draw') {
  const hits = Number(context.hits || 0);
  const eliminations = Number(context.eliminations || 0);
  const powerupsCollected = Number(context.powerupsCollected || 0);
  const damageTaken = Number(context.damageTaken || 0);
  const survivedSeconds = Number(context.survivedSeconds || 0);

  const parts = [];
  const hitXp = clamp(hits * 2, 0, 20);
  if (hitXp > 0) parts.push({ key: 'accuracy', xp: hitXp });

  const elimXp = clamp(eliminations * 12, 0, 36);
  if (elimXp > 0) parts.push({ key: 'eliminations', xp: elimXp });

  const powerupXp = clamp(powerupsCollected * 3, 0, 15);
  if (powerupXp > 0) parts.push({ key: 'powerups', xp: powerupXp });

  const survivalXp = clamp(Math.floor(survivedSeconds / 20), 0, 10);
  if (survivalXp > 0) parts.push({ key: 'survival', xp: survivalXp });

  if (result === 'win' && damageTaken <= 0) {
    parts.push({ key: 'flawless', xp: 15 });
  }

  const total = parts.reduce((sum, item) => sum + item.xp, 0);
  return { total, parts };
}

const GamificationService = {
  /**
   * Award XP and check for level-up achievements.
   */
  async awardXp(userId, amount) {
    const before = await User.findById(userId);
    const user = await User.addXp(userId, amount);
    // Check level achievements
    if (user.level >= 10) {
      await this.tryUnlock(userId, 'level_10');
    }
    return {
      user,
      amount,
      previousLevel: before?.level || 1,
      currentLevel: user.level,
      leveledUp: (user.level || 1) > (before?.level || 1),
    };
  },

  /**
   * Process end-of-game: update stats, award XP, check achievements.
   */
  async processGameEnd(userId, result, gameType = 'pong', context = {}) {
    const unlocked = [];

    const baseXp = baseXpForResult(result);
    const bonus = calculatePerformanceBonus(context, result);
    const totalXp = baseXp + bonus.total;
    const xpResult = await this.awardXp(userId, totalXp);

    if (result === 'win') {
      const firstWin = await this.tryUnlock(userId, 'first_win');
      if (firstWin?.achievement) unlocked.push(firstWin.achievement);

      const streak = await this.getWinStreak(userId, gameType);
      if (streak >= 5) {
        const streakUnlock = await this.tryUnlock(userId, 'win_streak_5');
        if (streakUnlock?.achievement) unlocked.push(streakUnlock.achievement);
      }
    }

    return {
      userId: Number(userId),
      gameType,
      result,
      xp: {
        base: baseXp,
        bonus: bonus.total,
        total: totalXp,
        parts: bonus.parts,
      },
      level: {
        from: xpResult.previousLevel,
        to: xpResult.currentLevel,
        leveledUp: xpResult.leveledUp,
      },
      unlockedAchievements: unlocked.map((a) => ({
        key: a.key,
        name: a.name,
        xpReward: a.xpReward || 0,
      })),
      snapshot: {
        xp: xpResult.user?.xp || 0,
        level: xpResult.user?.level || 1,
      },
    };
  },

  async getWinStreak(userId, gameType = 'pong') {
    const history = await Game.getMatchHistory(userId, { limit: 10, gameType });
    let streak = 0;
    for (const game of history) {
      if (Number(game.winnerId) === Number(userId)) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  },

  /**
   * Try to unlock an achievement. Notifies if newly unlocked.
   */
  async tryUnlock(userId, achievementKey) {
    const result = await Achievement.unlock(userId, achievementKey);
    if (result) {
      const xp = result.achievement.xpReward || 0;
      if (xp > 0) await User.addXp(userId, xp);
      await NotificationService.achievementUnlocked(userId, result.achievement.name);
    }
    return result;
  },

  /**
   * Check social achievements (called after adding friends, creating posts, etc).
   */
  async checkSocialAchievements(userId) {
    const friendCount = await Friend.count(userId);
    if (friendCount >= 10) {
      await this.tryUnlock(userId, 'social_butter');
    }
  },

  async checkPostAchievements(userId) {
    await this.tryUnlock(userId, 'first_post');
    await this.awardXp(userId, config.xp.perPost);
  },

  async checkOrgAchievements(userId) {
    await this.tryUnlock(userId, 'org_founder');
  },
};

export default GamificationService;
