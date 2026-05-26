/**
 * GamificationService — central hub for XP, level-ups, and achievement unlocks.
 *
 * All callers go through this service so that:
 *   • XP is always persisted server-side
 *   • Level-ups trigger a real-time notification
 *   • Achievement XP rewards are awarded automatically on unlock
 *   • Every unlock fires an achievement notification
 */
import prisma from '#config/prisma.js';
import Achievement from '#models/Achievement.js';
import Game from '#models/Game.js';
import NotificationService from '#services/notificationService.js';
import { error as logError } from '#lib/logger.js';

// Notification delivery is fire-and-forget — the XP/achievement state is
// already persisted by the time we get here. We don't want a flaky notify
// to roll back an unlock, but the previous `.catch(() => {})` swallowed
// the error completely. Log it so monitoring can see the failure.
function logNotifyError(context, err) {
  logError(`[gamification] notify failed (${context}):`, err?.message || err);
}

const XP_PER_LEVEL = 100;
const WIN_XP       = 30;
const LOSS_XP      = 5;
const WIN_COINS    = 20;

const GamificationService = {
  // ── XP ────────────────────────────────────────────────────────────────────

  /**
   * Increment a user's XP and persist the new level.
   * Fires a level_up notification and checks the level_10 achievement.
   */
  async awardXp(userId, amount) {
    userId = Number(userId);
    const updated = await prisma.userStats.upsert({
      where:  { userId },
      update: { xp: { increment: amount } },
      create: { userId, xp: amount, level: 0 },
    });

    const newLevel = Math.floor(updated.xp / XP_PER_LEVEL);
    const oldLevel = updated.level ?? 0;

    if (newLevel > oldLevel) {
      await prisma.userStats.update({
        where: { userId },
        data:  { level: newLevel },
      });
      NotificationService.notify({
        userId,
        type:    'level_up',
        title:   'Level Up!',
        message: `You reached level ${newLevel}!`,
      }).catch((err) => logNotifyError('level_up', err));
      if (newLevel >= 10) await this._unlockNoXp(userId, 'level_10');
    }

    return { xp: updated.xp, level: newLevel };
  },

  // ── Achievement unlock ────────────────────────────────────────────────────

  /**
   * Public unlock: awards the achievement's XP reward and notifies the user.
   * Returns the achievement object if newly unlocked, null otherwise.
   */
  async unlock(userId, achievementKey) {
    userId = Number(userId);
    const result = await Achievement.unlock(userId, achievementKey);
    if (!result) return null;

    const { achievement } = result;

    if ((achievement.xpReward ?? 0) > 0) {
      // level_10 awards XP directly to avoid an awardXp → unlock('level_10') loop
      if (achievementKey === 'level_10') {
        await prisma.userStats.upsert({
          where:  { userId },
          update: { xp: { increment: achievement.xpReward } },
          create: { userId, xp: achievement.xpReward },
        });
      } else {
        await this.awardXp(userId, achievement.xpReward);
      }
    }

    NotificationService
      .achievementUnlocked(userId, achievement.name)
      .catch((err) => logNotifyError(`achievement:${achievementKey}`, err));
    return achievement;
  },

  /** Internal: unlock without touching XP (used inside awardXp to prevent recursion). */
  async _unlockNoXp(userId, achievementKey) {
    userId = Number(userId);
    const result = await Achievement.unlock(userId, achievementKey);
    if (!result)
      return null;
    NotificationService
      .achievementUnlocked(userId, result.achievement.name)
      .catch((err) => logNotifyError(`achievement-nox:${achievementKey}`, err));
    return result.achievement;
  },

  // ── Game events ───────────────────────────────────────────────────────────

  async onWin(userId, gameType) {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return;

    await this.awardXp(userId, WIN_XP);

    await prisma.alpacaFarm.upsert({
      where:  { userId },
      update: { coins: { increment: WIN_COINS } },
      create: { userId, coins: WIN_COINS },
    });

    const streak = await prisma.userStats.upsert({
      where:  { userId },
      update: { winStreak: { increment: 1 } },
      create: { userId, winStreak: 1 },
    });

    // Achievement checks (game stats already updated by the caller)
    const gs = await Game.getStats(userId, gameType);
    if (gs.wins === 1)  await this.unlock(userId, 'first_win');
    if ((streak.winStreak ?? 0) >= 5) await this.unlock(userId, 'win_streak_5');
    if (gameType === 'spit_royale' && gs.wins >= 10) await this.unlock(userId, 'sharpshooter');
    if (gameType === 'alpaca_road' && gs.wins >= 5)  await this.unlock(userId, 'road_warrior');

    // top_player: #1 in any visible leaderboard (kills, obstacles, or coins).
    const [topKills, topObstacles, topCoins] = await Promise.all([
      Game.getKillsLeaderboard({ limit: 1 }),
      Game.getObstaclesLeaderboard({ limit: 1 }),
      Game.getCoinsLeaderboard({ limit: 1 }),
    ]);
    if (
      topKills[0]?.userId === userId ||
      topObstacles[0]?.userId === userId ||
      topCoins[0]?.userId === userId
    ) {
      await this.unlock(userId, 'top_player');
    }

    NotificationService.broadcastAll('game:finish');
  },

  async onLoss(userId) {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return;

    await this.awardXp(userId, LOSS_XP);

    await prisma.userStats.upsert({
      where:  { userId },
      update: { winStreak: 0 },
      create: { userId, winStreak: 0 },
    });

    NotificationService.broadcastAll('game:finish');
  },

  // ── Auth events ───────────────────────────────────────────────────────────

  async onLogin(userId) {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return;

    await this.unlock(userId, 'first_login');
  },

  // ── Post events ───────────────────────────────────────────────────────────

  async onPostLiked(postAuthorId, newLikesCount) {
    postAuthorId = Number(postAuthorId);
    if (!Number.isFinite(postAuthorId)) return;

    if (newLikesCount >= 10) await this.unlock(postAuthorId, 'kinda_relatable');
  },

  // ── Farm events ───────────────────────────────────────────────────────────

  async onFarmSave(userId, farmData) {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return;

    const items = farmData?.items ?? [];
    if (Array.isArray(items) && items.length > 0) {
      await this.unlock(userId, 'farm_started');
    }

    const coins = typeof farmData?.coins === 'number' ? farmData.coins : null;
    if (coins !== null && coins >= 1000) {
      await this.unlock(userId, 'coin_hoarder');
    }
  },

  // ── Message events ────────────────────────────────────────────────────────

  async onMessageSent(userId) {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return;
    const count = await prisma.message.count({ where: { senderId: userId } });
    if (count >= 50) await this.unlock(userId, 'chatterbox');
  },
};

export default GamificationService;
