/**
 * Friend Model — friends + friend_requests tables
 * @owner ValGSgit
 */
import { query, getClient } from '../config/database.js';

const Friend = {
  /**
   * Send a friend request.
   */
  async sendRequest(senderId, receiverId) {
    if (senderId === receiverId) throw Object.assign(new Error('Cannot friend yourself'), { status: 400 });

    const { rows } = await query(
      `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending', updated_at = NOW()
       RETURNING *`,
      [senderId, receiverId],
    );
    return rows[0];
  },

  /**
   * Accept a friend request — creates mutual friend rows, updates request.
   */
  async acceptRequest(requestId, receiverId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `UPDATE friend_requests SET status = 'accepted', updated_at = NOW()
         WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *`,
        [requestId, receiverId],
      );
      if (!rows[0]) throw Object.assign(new Error('Request not found or already handled'), { status: 404 });

      const req = rows[0];
      await client.query(
        `INSERT INTO friends (user_id, friend_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING`,
        [req.sender_id, req.receiver_id],
      );

      await client.query('COMMIT');
      return req;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Decline a friend request.
   */
  async declineRequest(requestId, receiverId) {
    const { rows } = await query(
      `UPDATE friend_requests SET status = 'declined', updated_at = NOW()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *`,
      [requestId, receiverId],
    );
    return rows[0] || null;
  },

  /**
   * Remove a friend (mutual).
   */
  async removeFriend(userId, friendId) {
    await query(
      `DELETE FROM friends WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
      [userId, friendId],
    );
  },

  /**
   * Get friends list with user details.
   */
  async getFriends(userId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar, u.is_online, u.status, u.level
       FROM friends f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1 ORDER BY u.is_online DESC, u.username ASC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  },

  /**
   * Get online friends only.
   */
  async getOnlineFriends(userId) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar, u.status, u.level
       FROM friends f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND u.is_online = TRUE ORDER BY u.username`,
      [userId],
    );
    return rows;
  },

  /**
   * Get pending requests received.
   */
  async getPendingReceived(userId) {
    const { rows } = await query(
      `SELECT fr.*, u.username AS sender_username, u.avatar AS sender_avatar
       FROM friend_requests fr JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending' ORDER BY fr.created_at DESC`,
      [userId],
    );
    return rows;
  },

  /**
   * Get pending requests sent.
   */
  async getPendingSent(userId) {
    const { rows } = await query(
      `SELECT fr.*, u.username AS receiver_username, u.avatar AS receiver_avatar
       FROM friend_requests fr JOIN users u ON u.id = fr.receiver_id
       WHERE fr.sender_id = $1 AND fr.status = 'pending' ORDER BY fr.created_at DESC`,
      [userId],
    );
    return rows;
  },

  /**
   * Check if two users are friends.
   */
  async areFriends(userId, otherUserId) {
    const { rows } = await query(
      `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2`,
      [userId, otherUserId],
    );
    return rows.length > 0;
  },

  /**
   * Count friends.
   */
  async count(userId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total FROM friends WHERE user_id = $1`,
      [userId],
    );
    return rows[0].total;
  },

  /**
   * Block a user.
   */
  async blockUser(userId, blockedUserId) {
    await this.removeFriend(userId, blockedUserId);
    const { rows } = await query(
      `INSERT INTO blocked_users (user_id, blocked_user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [userId, blockedUserId],
    );
    return rows[0];
  },

  /**
   * Unblock a user.
   */
  async unblockUser(userId, blockedUserId) {
    await query(
      `DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2`,
      [userId, blockedUserId],
    );
  },

  /**
   * Get blocked users.
   */
  async getBlocked(userId) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar FROM blocked_users b
       JOIN users u ON u.id = b.blocked_user_id WHERE b.user_id = $1`,
      [userId],
    );
    return rows;
  },
};

export default Friend;
