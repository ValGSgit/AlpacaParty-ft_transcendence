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

router.get('/stats', getStats);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/toggle-admin', toggleAdmin);
router.get('/data-requests', listDataRequests);
router.post('/data-requests/:id/process', processDataRequest);

export default router;
