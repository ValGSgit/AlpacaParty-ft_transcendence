/**
 * Gamification Service — XP, leveling, achievement checks
 * @owner ValGSgit
 */
import config from '../config/index.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import Friend from '../models/Friend.js';
import NotificationService from './notificationService.js';

const GamificationService = {
  /**
   * Award XP and check for level-up achievements.
   */
  async awardXp(userId, amount) {
    const user = await User.addXp(userId, amount);
    // Check level achievements
    if (user.level >= 10) {
      await this.tryUnlock(userId, 'level_10');
    }
    return user;
  },

  /**
   * Process end-of-game: update stats, award XP, check achievements.
   */
  async processGameEnd(userId, result, gameType = 'pong') {
    const xp = result === 'win' ? config.xp.perWin
      : result === 'loss' ? config.xp.perLoss
      : config.xp.perDraw;

    await this.awardXp(userId, xp);

    if (result === 'win') {
      await this.tryUnlock(userId, 'first_win');
    }
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
