/**
 * User Model — Database access layer for users table
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/9
 */
import { query } from '../config/database.js';

const SAFE_FIELDS = `id, username, email, avatar, bio, status, is_public, is_online,
       is_admin, oauth_provider, xp, level, last_seen, created_at, updated_at, coins, upgrades, items, alpacas`;

const User = {
  /**
   * Create a new user (local auth).
   */
  async create({ username, email, passwordHash }) {
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${SAFE_FIELDS}`,
      [username, email, passwordHash],
    );
    return rows[0];
  },

  /**
   * Create or find a user via OAuth provider.
   */
  async findOrCreateOAuth({ provider, oauthId, username, email, avatar }) {
    // Try to find existing OAuth user
    const { rows: existing } = await query(
      `SELECT ${SAFE_FIELDS} FROM users WHERE oauth_provider = $1 AND oauth_id = $2`,
      [provider, oauthId],
    );
    if (existing[0]) return { user: existing[0], created: false };

    // Create new OAuth user
    const { rows } = await query(
      `INSERT INTO users (username, email, oauth_provider, oauth_id, avatar, password_hash)
       VALUES ($1, $2, $3, $4, COALESCE($5, '/avatars/default.png'), '')
       ON CONFLICT (email) DO UPDATE SET oauth_provider = $3, oauth_id = $4
       RETURNING ${SAFE_FIELDS}`,
      [username, email, provider, oauthId, avatar],
    );
    return { user: rows[0], created: true };
  },

  /**
   * Find a user by ID (public-safe fields).
   */
  async findById(id) {
    const { rows } = await query(
      `SELECT ${SAFE_FIELDS} FROM users WHERE id = $1`,
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
       RETURNING ${SAFE_FIELDS}`,
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
   * Add XP and auto-level.
   */
  async addXp(id, amount) {
    const { rows } = await query(
      `UPDATE users SET xp = xp + $1,
              level = GREATEST(1, (xp + $1) / 100 + 1),
              updated_at = NOW()
       WHERE id = $2 RETURNING ${SAFE_FIELDS}`,
      [amount, id],
    );
    return rows[0];
  },

  /**
   * List all users (paginated, public fields only).
   */
  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT id, username, avatar, bio, status, is_public, is_online, xp, level, last_seen, created_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  },

  /**
   * Count all users.
   */
  async count() {
    const { rows } = await query(`SELECT COUNT(*)::int AS total FROM users`);
    return rows[0].total;
  },

  /**
   * Advanced search with filters, sorting, pagination.
   */
  async search(term, { limit = 20, offset = 0, sort = 'username', order = 'ASC' } = {}) {
    const allowedSort = ['username', 'created_at', 'level', 'xp'];
    const sortCol = allowedSort.includes(sort) ? sort : 'username';
    const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows } = await query(
      `SELECT id, username, avatar, is_online, xp, level
       FROM users WHERE username ILIKE $1 OR bio ILIKE $1
       ORDER BY ${sortCol} ${sortDir} LIMIT $2 OFFSET $3`,
      [`${term}%`, limit, offset],
    );
    return rows;
  },

  /**
   * Delete a user and all cascaded data (GDPR).
   */
  async deleteById(id) {
    const { rowCount } = await query(`DELETE FROM users WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  /**
   * Get full user data export for GDPR.
   */
  async getFullExport(id) {
    const [user, friends, messages, games, posts] = await Promise.all([
      query(`SELECT id, username, email, bio, status, xp, level, created_at FROM users WHERE id = $1`, [id]),
      query(`SELECT f.friend_id, u.username FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1`, [id]),
      query(`SELECT id, receiver_id, content, created_at FROM messages WHERE sender_id = $1 ORDER BY created_at`, [id]),
      query(`SELECT * FROM games WHERE player1_id = $1 OR player2_id = $1 ORDER BY created_at`, [id]),
      query(`SELECT id, content, image_url, created_at FROM posts WHERE author_id = $1 ORDER BY created_at`, [id]),
    ]);
    return {
      user: user.rows[0],
      friends: friends.rows,
      messages: messages.rows,
      games: games.rows,
      posts: posts.rows,
    };
  },
};

export default User;
