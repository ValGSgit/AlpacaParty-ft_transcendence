/**
 * Admin Routes — /api/admin (admin-only)
 */
import express from 'express';
import {
  getStats, listUsers, deleteUser, toggleAdmin,
  listDataRequests, processDataRequest,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
router.use(authenticate, requireAdmin);

// Tighter rate limit for admin actions
router.use(rateLimit({ windowMs: 60_000, max: 60 }));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Site-wide statistics
 *     description: Returns aggregate counts for users, posts, messages, games played, and more.
 *     responses:
 *       200:
 *         description: Site stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers: { type: integer, example: 1042 }
 *                 activeUsers: { type: integer, example: 87 }
 *                 totalPosts: { type: integer, example: 5210 }
 *                 totalGames: { type: integer, example: 3300 }
 *                 pendingDataRequests: { type: integer, example: 2 }
 *       403: { description: Admin access required }
 */
router.get('/stats', getStats);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (including private profiles)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by username or email
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: All users with admin fields visible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 total: { type: integer }
 */
router.get('/users', listUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user account (irreversible)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403: { description: Cannot delete another admin }
 *       404: { description: User not found }
 */
router.delete('/users/:id', deleteUser);

/**
 * @openapi
 * /admin/users/{id}/toggle-admin:
 *   put:
 *     tags: [Admin]
 *     summary: Grant or revoke admin privileges for a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Admin status toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       404: { description: User not found }
 */
router.put('/users/:id/toggle-admin', toggleAdmin);

/**
 * @openapi
 * /admin/data-requests:
 *   get:
 *     tags: [Admin]
 *     summary: List all pending GDPR data requests
 *     responses:
 *       200:
 *         description: Pending requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       userId: { type: integer }
 *                       username: { type: string }
 *                       type: { type: string, enum: [export, deletion] }
 *                       status: { type: string, enum: [pending, processing, completed, rejected] }
 *                       created_at: { type: string, format: date-time }
 */
router.get('/data-requests', listDataRequests);

/**
 * @openapi
 * /admin/data-requests/{id}/process:
 *   post:
 *     tags: [Admin]
 *     summary: Process a GDPR data request (approve / reject)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Data request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject], example: approve }
 *               note: { type: string, nullable: true, example: "Processed and emailed export" }
 *     responses:
 *       200:
 *         description: Request processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400: { description: Invalid action }
 *       404: { description: Request not found }
 */
router.post('/data-requests/:id/process', processDataRequest);

export default router;
