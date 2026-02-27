/**
 * Message Model — Direct messages between users
 * @owner ValGSgit
 */
import { query } from '../config/database.js';

const Message = {
  /**
   * Send a direct message.
   */
  async create({ senderId, receiverId, content }) {
    const { rows } = await query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiverId, content],
    );
    return rows[0];
  },

  /**
   * Get conversation between two users (paginated, newest first).
   */
  async getConversation(userId, otherUserId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT m.*, s.username AS sender_username, s.avatar AS sender_avatar
       FROM messages m JOIN users s ON s.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`,
      [userId, otherUserId, limit, offset],
    );
    return rows.reverse(); // return in chronological order
  },

  /**
   * Get all conversations (latest message per user).
   */
  async getConversationsList(userId) {
    const { rows } = await query(
      `SELECT DISTINCT ON (partner_id) partner_id, partner_username, partner_avatar,
              content, created_at, is_read
       FROM (
         SELECT
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
           CASE WHEN sender_id = $1 THEN r.username ELSE s.username END AS partner_username,
           CASE WHEN sender_id = $1 THEN r.avatar ELSE s.avatar END AS partner_avatar,
           m.content, m.created_at, m.is_read
         FROM messages m
         JOIN users s ON s.id = m.sender_id
         JOIN users r ON r.id = m.receiver_id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
       ) sub
       ORDER BY partner_id, created_at DESC`,
      [userId],
    );
    return rows;
  },

  /**
   * Mark messages as read.
   */
  async markAsRead(receiverId, senderId) {
    await query(
      `UPDATE messages SET is_read = TRUE
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE`,
      [receiverId, senderId],
    );
  },

  /**
   * Count unread messages for user.
   */
  async countUnread(userId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total FROM messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return rows[0].total;
  },
};

export default Message;
