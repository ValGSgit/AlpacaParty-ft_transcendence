/**
 * File Model — uploaded files metadata
 * @owner ValGSgit
 */
import { query } from '../config/database.js';

const File = {
  async create({ uploaderId, originalName, storedName, mimeType, sizeBytes, url }) {
    const { rows } = await query(
      `INSERT INTO files (uploader_id, original_name, stored_name, mime_type, size_bytes, url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uploaderId, originalName, storedName, mimeType, sizeBytes, url],
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM files WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async getByUploader(uploaderId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT * FROM files WHERE uploader_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [uploaderId, limit, offset],
    );
    return rows;
  },

  async delete(id, uploaderId) {
    const { rows } = await query(
      `DELETE FROM files WHERE id = $1 AND uploader_id = $2 RETURNING stored_name`,
      [id, uploaderId],
    );
    return rows[0] || null;
  },
};

export default File;
