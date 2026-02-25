/**
 * Achievement Model — Database access layer for achievements tables
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/9
 */
import { query } from '../config/database.js';

const Achievement = {
  /**
   * Unlock an achievement for a user by key.
   * Safe to call fire-and-forget — returns null if key doesn't exist or
   * the user already has it (ON CONFLICT DO NOTHING).
   */
  async unlock(userId, key) {
    const { rows: [achievement] } = await query(
      `SELECT id FROM achievements WHERE key = $1`,
      [key],
    );
    if (!achievement) return null;

    const { rows } = await query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING
       RETURNING *`,
      [userId, achievement.id],
    );
    return rows[0] || null;
  },

  /**
   * Get all achievements unlocked by a user (most-recent first).
   */
  async getForUser(userId) {
    const { rows } = await query(
      `SELECT a.*, ua.unlocked_at
       FROM achievements a
       JOIN user_achievements ua ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId],
    );
    return rows;
  },

  /**
   * Get the full achievements catalogue.
   */
  async getAll() {
    const { rows } = await query(
      `SELECT * FROM achievements ORDER BY id`,
    );
    return rows;
  },
};

export default Achievement;
