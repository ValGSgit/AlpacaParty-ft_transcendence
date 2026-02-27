/**
 * Organization Model
 * @owner ValGSgit
 */
import { query, getClient } from '../config/database.js';

const Organization = {
  async create({ name, description = '', ownerId, avatar }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO organizations (name, description, owner_id, avatar)
         VALUES ($1, $2, $3, COALESCE($4, '/avatars/default-org.png')) RETURNING *`,
        [name, description, ownerId, avatar],
      );
      const org = rows[0];
      await client.query(
        `INSERT INTO organization_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [org.id, ownerId],
      );
      await client.query('COMMIT');
      return org;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM organizations WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['name', 'description', 'avatar'];
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
      `UPDATE organizations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await query(`DELETE FROM organizations WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async addMember(orgId, userId, role = 'member') {
    const { rows } = await query(
      `INSERT INTO organization_members (org_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (org_id, user_id) DO NOTHING RETURNING *`,
      [orgId, userId, role],
    );
    return rows[0];
  },

  async removeMember(orgId, userId) {
    await query(`DELETE FROM organization_members WHERE org_id = $1 AND user_id = $2`, [orgId, userId]);
  },

  async getMembers(orgId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar, u.is_online, om.role, om.joined_at
       FROM organization_members om JOIN users u ON u.id = om.user_id
       WHERE om.org_id = $1 ORDER BY om.role, u.username LIMIT $2 OFFSET $3`,
      [orgId, limit, offset],
    );
    return rows;
  },

  async isMember(orgId, userId) {
    const { rows } = await query(
      `SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, userId],
    );
    return rows[0] || null;
  },

  async getUserOrgs(userId) {
    const { rows } = await query(
      `SELECT o.*, om.role FROM organizations o
       JOIN organization_members om ON om.org_id = o.id
       WHERE om.user_id = $1 ORDER BY o.name`,
      [userId],
    );
    return rows;
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT o.*, (SELECT COUNT(*)::int FROM organization_members WHERE org_id = o.id) AS member_count
       FROM organizations o ORDER BY o.name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  },

  async search(term, { limit = 20 } = {}) {
    const { rows } = await query(
      `SELECT o.*, (SELECT COUNT(*)::int FROM organization_members WHERE org_id = o.id) AS member_count
       FROM organizations o WHERE o.name ILIKE $1 OR o.description ILIKE $1
       ORDER BY o.name LIMIT $2`,
      [`%${term}%`, limit],
    );
    return rows;
  },
};

export default Organization;
