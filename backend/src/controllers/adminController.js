/**
 * Admin Controller — site statistics & data management dashboard
 * @owner ValGSgit
 */
import User from '../models/User.js';
import Post from '../models/Post.js';
import Game from '../models/Game.js';
import DataRequest from '../models/DataRequest.js';
import DataExportService from '../services/dataExportService.js';
import NotificationService from '../services/notificationService.js';
import { query } from '../config/database.js';

/** GET /api/admin/stats — site-wide statistics */
export const getStats = async (req, res, next) => {
  try {
    const [userTotal, usersOnline, gamesActive, postTotal, pendingRequests] = await Promise.all([
      User.count(),
      query(`SELECT COUNT(*)::int AS c FROM users WHERE is_online = TRUE`).then((r) => r.rows[0].c),
      Game.countActive(),
      Post.count(),
      DataRequest.getPending().then((r) => r.length),
    ]);
    res.json({
      stats: { userTotal, usersOnline, gamesActive, postTotal, pendingRequests },
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

/** GET /api/admin/users?search=&limit=50&offset=0 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let users;
    if (search) {
      users = await User.search(search, { limit: Number(limit), offset: Number(offset) });
    } else {
      users = await User.findAll({ limit: Number(limit), offset: Number(offset) });
    }
    const total = await User.count();
    res.json({ users, total });
  } catch (err) { next(err); }
};

/** DELETE /api/admin/users/:id */
export const deleteUser = async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: { message: 'Cannot delete yourself' } });
    }
    const deleted = await User.deleteById(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

/** PUT /api/admin/users/:id/toggle-admin */
export const toggleAdmin = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, username, is_admin`,
      [Number(req.params.id)],
    );
    if (!rows[0]) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

/** GET /api/admin/data-requests — GDPR requests queue */
export const listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataRequest.getPending();
    res.json({ requests });
  } catch (err) { next(err); }
};

/** POST /api/admin/data-requests/:id/process */
export const processDataRequest = async (req, res, next) => {
  try {
    const request = await DataRequest.findById(Number(req.params.id));
    if (!request) return res.status(404).json({ error: { message: 'Request not found' } });

    await DataRequest.updateStatus(request.id, 'processing');

    if (request.type === 'export') {
      const { data, extension, contentType } = await DataExportService.exportUserData(request.user_id, 'json');
      // In production, upload to S3 / object store and save URL
      const fileUrl = `/api/admin/data-requests/${request.id}/download`;
      await DataRequest.updateStatus(request.id, 'completed', fileUrl);
      await NotificationService.dataRequestCompleted(request.user_id, 'export');
      res.json({ message: 'Export completed', fileUrl });
    } else if (request.type === 'delete') {
      await User.deleteById(request.user_id);
      await DataRequest.updateStatus(request.id, 'completed');
      res.json({ message: 'User account deleted' });
    } else {
      res.status(400).json({ error: { message: 'Unknown request type' } });
    }
  } catch (err) { next(err); }
};
