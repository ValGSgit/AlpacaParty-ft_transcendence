/**
 * Notification Model
 * @owner ValGSgit
 */
import { query } from '../config/database.js';

const Notification = {
  async create({ userId, type, title, message, referenceType, referenceId }) {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, type, title || '', message, referenceType || null, referenceId || null],
    );
    return rows[0];
  },

  async getForUser(userId, { limit = 30, offset = 0, unreadOnly = false } = {}) {
    let q = `SELECT * FROM notifications WHERE user_id = $1`;
    if (unreadOnly) q += ` AND is_read = FALSE`;
    q += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    const { rows } = await query(q, [userId, limit, offset]);
    return rows;
  },

  async markRead(id, userId) {
    const { rows } = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return rows[0];
  },

  async markAllRead(userId) {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [userId]);
  },

  async countUnread(userId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return rows[0].total;
  },

  async delete(id, userId) {
    const { rowCount } = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rowCount > 0;
  },
};

export default Notification;
