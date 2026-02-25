/**
 * User Model — Database access layer for users table
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/9
 */
import { query } from '../config/database.js';

const User = {
  /**
   * Create a new user.
   * @param {{ username: string, email: string, passwordHash: string }} data
   * @returns {Promise<object>} The created user (without password_hash).
   */
  async create({ username, email, passwordHash }) {
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar, bio, status, is_online, is_admin, created_at`,
      [username, email, passwordHash],
    );
    return rows[0];
  },

  /**
   * Find a user by ID (public-safe fields).
   */
  async findById(id) {
    const { rows } = await query(
      `SELECT id, username, email, avatar, bio, status, is_online, is_admin, last_seen, created_at, coins, upgrades, items, alpacas
       FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Find a user by ID — includes password_hash for auth checks.
   */
  async findByIdWithPassword(id) {
    const { rows } = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Find a user by username.
   */
  async findByUsername(username) {
    const { rows } = await query(
      `SELECT * FROM users WHERE username = $1`,
      [username],
    );
    return rows[0] || null;
  },

  /**
   * Find a user by email.
   */
  async findByEmail(email) {
    const { rows } = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );
    return rows[0] || null;
  },

  /**
   * Update a user's profile fields.
   * @param {number} id
   * @param {{ username?: string, email?: string, avatar?: string, bio?: string, status?: string }} fields
   */
  async update(id, fields) {
    const allowed = ['username', 'email', 'avatar', 'bio', 'status', 'coins', 'upgrades', 'items', 'alpacas'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, avatar, bio, status, is_online, is_admin, created_at, updated_at`,
      values,
    );
    return rows[0] || null;
  },

  /**
   * Update password hash.
   */
  async updatePassword(id, passwordHash) {
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, id],
    );
  },

  /**
   * Set online/offline status.
   */
  async setOnline(id, isOnline) {
    await query(
      `UPDATE users SET is_online = $1, last_seen = NOW() WHERE id = $2`,
      [isOnline, id],
    );
  },

  /**
   * List all users (paginated, public fields only).
   */
  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT id, username, avatar, bio, status, is_online, last_seen, created_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  },

  /**
   * Search users by username prefix.
   */
  async search(term, { limit = 20 } = {}) {
    const { rows } = await query(
      `SELECT id, username, avatar, is_online
       FROM users WHERE username ILIKE $1 LIMIT $2`,
      [`${term}%`, limit],
    );
    return rows;
  },
};

export default User;
