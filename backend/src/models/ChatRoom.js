/**
 * ChatRoom Model — group / room-based chat
 * @owner ValGSgit
 */
import { query, getClient } from '../config/database.js';

const ChatRoom = {
  /**
   * Create a chat room.
   */
  async create({ name, ownerId, isPrivate = false }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO chat_rooms (name, owner_id, is_private)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, ownerId, isPrivate],
      );
      const room = rows[0];
      await client.query(
        `INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [room.id, ownerId],
      );
      await client.query('COMMIT');
      return room;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM chat_rooms WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async addMember(roomId, userId, role = 'member') {
    const { rows } = await query(
      `INSERT INTO chat_room_members (room_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (room_id, user_id) DO NOTHING RETURNING *`,
      [roomId, userId, role],
    );
    return rows[0];
  },

  async removeMember(roomId, userId) {
    await query(`DELETE FROM chat_room_members WHERE room_id = $1 AND user_id = $2`, [roomId, userId]);
  },

  async getMembers(roomId) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar, u.is_online, crm.role
       FROM chat_room_members crm JOIN users u ON u.id = crm.user_id
       WHERE crm.room_id = $1 ORDER BY crm.role, u.username`,
      [roomId],
    );
    return rows;
  },

  async isMember(roomId, userId) {
    const { rows } = await query(
      `SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId],
    );
    return rows.length > 0;
  },

  async sendMessage({ roomId, senderId, content }) {
    const { rows } = await query(
      `INSERT INTO chat_room_messages (room_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [roomId, senderId, content],
    );
    return rows[0];
  },

  async getMessages(roomId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT m.*, u.username AS sender_username, u.avatar AS sender_avatar
       FROM chat_room_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [roomId, limit, offset],
    );
    return rows.reverse();
  },

  async getUserRooms(userId) {
    const { rows } = await query(
      `SELECT cr.*, crm.role FROM chat_rooms cr
       JOIN chat_room_members crm ON crm.room_id = cr.id
       WHERE crm.user_id = $1 ORDER BY cr.name`,
      [userId],
    );
    return rows;
  },

  async delete(id) {
    const { rowCount } = await query(`DELETE FROM chat_rooms WHERE id = $1`, [id]);
    return rowCount > 0;
  },
};

export default ChatRoom;
