/**
 * Achievement Model — achievements + daily challenges + gamification
 * @owner ValGSgit
 */
import { query } from '../config/database.js';

const Achievement = {
  // ── Achievements ───────────────────────────────────────────

  async getAll() {
    const { rows } = await query(`SELECT * FROM achievements ORDER BY name`);
    return rows;
  },

  async getUserAchievements(userId) {
    const { rows } = await query(
      `SELECT a.*, ua.unlocked_at
       FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC`,
      [userId],
    );
    return rows;
  },

  async unlock(userId, achievementKey) {
    const { rows: ach } = await query(`SELECT * FROM achievements WHERE key = $1`, [achievementKey]);
    if (!ach[0]) return null;

    const { rows } = await query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2) ON CONFLICT (user_id, achievement_id) DO NOTHING RETURNING *`,
      [userId, ach[0].id],
    );
    // Returns null if already unlocked (no insert happened)
    return rows[0] ? { ...rows[0], achievement: ach[0] } : null;
  },

  async hasAchievement(userId, achievementKey) {
    const { rows } = await query(
      `SELECT 1 FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1 AND a.key = $2`,
      [userId, achievementKey],
    );
    return rows.length > 0;
  },

  // ── Daily Challenges ───────────────────────────────────────

  async getTodaysChallenges() {
    const { rows } = await query(
      `SELECT * FROM daily_challenges WHERE active_date = CURRENT_DATE`,
    );
    return rows;
  },

  async getUserChallengeProgress(userId) {
    const { rows } = await query(
      `SELECT dc.*, udc.completed, udc.completed_at
       FROM daily_challenges dc
       LEFT JOIN user_daily_challenges udc ON udc.challenge_id = dc.id AND udc.user_id = $1
       WHERE dc.active_date = CURRENT_DATE`,
      [userId],
    );
    return rows;
  },

  async completeChallenge(userId, challengeId) {
    const { rows } = await query(
      `INSERT INTO user_daily_challenges (user_id, challenge_id, completed, completed_at)
       VALUES ($1, $2, TRUE, NOW())
       ON CONFLICT (user_id, challenge_id)
       DO UPDATE SET completed = TRUE, completed_at = NOW()
       RETURNING *`,
      [userId, challengeId],
    );
    return rows[0];
  },
};

export default Achievement;
