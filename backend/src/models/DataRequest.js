/**
 * DataRequest Model — GDPR data export/delete requests
 * @owner ValGSgit
 */
import { query } from '../config/database.js';

const DataRequest = {
  async create({ userId, type }) {
    const { rows } = await query(
      `INSERT INTO data_requests (user_id, type) VALUES ($1, $2) RETURNING *`,
      [userId, type],
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM data_requests WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async getByUser(userId) {
    const { rows } = await query(
      `SELECT * FROM data_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  },

  async updateStatus(id, status, fileUrl = null) {
    const { rows } = await query(
      `UPDATE data_requests SET status = $1, file_url = COALESCE($2, file_url),
              completed_at = CASE WHEN $1 IN ('completed','cancelled') THEN NOW() ELSE NULL END
       WHERE id = $3 RETURNING *`,
      [status, fileUrl, id],
    );
    return rows[0];
  },

  async getPending() {
    const { rows } = await query(
      `SELECT dr.*, u.username FROM data_requests dr JOIN users u ON u.id = dr.user_id
       WHERE dr.status IN ('pending', 'processing') ORDER BY dr.created_at`,
    );
    return rows;
  },
};

export default DataRequest;
