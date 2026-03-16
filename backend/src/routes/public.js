/**
 * Public API Routes — /api/public  (API key required)
 * @owner ValGSgit
 *
 * Rate limited. Requires X-API-Key header.
 *
 * Endpoints:
 *   GET  /api/public/users
 *   GET  /api/public/users/:id
 *   GET  /api/public/leaderboard
 *   GET  /api/public/posts
 *   GET  /api/public/organizations
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireApiKey } from '../middleware/apiKey.js';
import {
  listUsers, getUser, getLeaderboard, getPosts, listOrganizations, getMockDataset,
} from '../controllers/publicApiController.js';

const router = express.Router();

// Stricter rate limit for public API
router.use(rateLimit({ windowMs: 60_000, max: 30, message: 'Public API rate limit exceeded' }));
router.use(requireApiKey);

// ── Documentation endpoint ──────────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    name: 'AlpacaParty Public API',
    version: '1.0',
    authentication: 'X-API-Key header required',
    endpoints: [
      { method: 'GET', path: '/api/public/users', description: 'List public users', params: 'search, limit, offset' },
      { method: 'GET', path: '/api/public/users/:id', description: 'Get a public user profile' },
      { method: 'GET', path: '/api/public/leaderboard', description: 'Game leaderboard', params: 'gameType, limit, offset' },
      { method: 'GET', path: '/api/public/posts', description: 'Public feed posts', params: 'limit, offset' },
      { method: 'GET', path: '/api/public/organizations', description: 'List organizations', params: 'search, limit, offset' },
    ],
  });
});

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.get('/leaderboard', getLeaderboard);
router.get('/posts', getPosts);
router.get('/organizations', listOrganizations);
router.get('/mock', getMockDataset);

export default router;
