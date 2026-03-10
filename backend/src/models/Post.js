/**
 * Post Model — feed / social posts
 * @owner ValGSgit
 */
import { query, getClient } from '../config/database.js';

const Post = {
  async create({ authorId, content, imageUrl = null, isPublic = true }) {
    const { rows } = await query(
      `INSERT INTO posts (author_id, content, image_url, is_public)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [authorId, content, imageUrl, isPublic],
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar
       FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = $1`,
      [id],
    );
    return rows[0] || null;
  },

  async update(id, authorId, fields) {
    const allowed = ['content', 'image_url', 'is_public'];
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
    values.push(id, authorId);

    const { rows } = await query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $${idx} AND author_id = $${idx + 1} RETURNING *`,
      values,
    );
    return rows[0] || null;
  },

  async delete(id, authorId) {
    const { rowCount } = await query(
      `DELETE FROM posts WHERE id = $1 AND author_id = $2`,
      [id, authorId],
    );
    return rowCount > 0;
  },

  /**
   * Public feed — public posts from public users.
   */
  async getFeed({ limit = 20, offset = 0, viewerId = null } = {}) {
    const { rows } = await query(
      `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar,
              EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) AS liked
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.is_public = TRUE AND u.is_public = TRUE
       ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset, viewerId || 0],
    );
    return rows;
  },

  /**
   * User's own posts.
   */
  async getByUser(userId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  },

  async like(postId, userId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, userId],
      );
      await client.query(
        `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1`,
        [postId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async unlike(postId, userId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      await client.query(
        `UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1`,
        [postId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async count() {
    const { rows } = await query(`SELECT COUNT(*)::int AS total FROM posts`);
    return rows[0].total;
  },
};

export default Post;
