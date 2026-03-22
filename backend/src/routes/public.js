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
  createPost, updatePost, deletePost,
} from '../controllers/publicApiController.js';

const router = express.Router();

// ── Documentation endpoint — no auth required ───────────────
router.get('/', (_req, res) => {
  res.json({
    name: 'AlpacaParty Public API',
    version: '1.0',
    authentication: 'X-API-Key header required (X-API-Key: <your-key>)',
    rateLimit: '30 requests per minute',
    endpoints: [
      { method: 'GET',    path: '/api/public/users',        description: 'List public users',            params: 'search, limit, offset, anonymized' },
      { method: 'GET',    path: '/api/public/users/:id',    description: 'Get a public user profile',    params: 'anonymized' },
      { method: 'GET',    path: '/api/public/leaderboard',  description: 'Game leaderboard',             params: 'gameType, limit, offset, anonymized' },
      { method: 'GET',    path: '/api/public/posts',        description: 'Public feed posts',            params: 'limit, offset, anonymized' },
      { method: 'GET',    path: '/api/public/organizations',description: 'List organizations',           params: 'search, limit, offset' },
      { method: 'GET',    path: '/api/public/mock',         description: 'Anonymized mock dataset' },
      { method: 'POST',   path: '/api/public/posts',        description: 'Create a post (service-level)', body: 'authorId, content, imageUrl?' },
      { method: 'PUT',    path: '/api/public/posts/:id',    description: 'Update a post (service-level)', body: 'content?, imageUrl?' },
      { method: 'DELETE', path: '/api/public/posts/:id',    description: 'Delete a post (service-level)' },
    ],
  });
});

// Stricter rate limit + API key required for all data endpoints
router.use(rateLimit({ windowMs: 60_000, max: 30, message: 'Public API rate limit exceeded' }));
router.use(requireApiKey);

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.get('/leaderboard', getLeaderboard);
router.get('/posts', getPosts);
router.post('/posts', createPost);
router.put('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);
router.get('/organizations', listOrganizations);
router.get('/mock', getMockDataset);

export default router;
