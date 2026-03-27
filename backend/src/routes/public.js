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
import { validate, z } from '../middleware/validate.js';
import { positiveId, imageUrlSchema } from '../schemas/shared.js';

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

// Rate limit + API key required for all data endpoints
router.use(rateLimit({ windowMs: 60_000, max: 100, message: 'Public API rate limit exceeded' }));
router.use(requireApiKey);

/**
 * @openapi
 * /public/users:
 *   get:
 *     tags: [Public API]
 *     summary: List public users
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by username
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *       - $ref: '#/components/parameters/anonymizedParam'
 *     responses:
 *       200:
 *         description: Public user list (private profiles excluded)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       username: { type: string }
 *                       avatar: { type: string, nullable: true }
 *                       level: { type: integer }
 *                       xp: { type: integer }
 *                       is_online: { type: boolean }
 *       401: { description: Missing or invalid X-API-Key }
 */
router.get('/users', listUsers);

/**
 * @openapi
 * /public/users/{id}:
 *   get:
 *     tags: [Public API]
 *     summary: Get a single public user profile
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - $ref: '#/components/parameters/anonymizedParam'
 *     responses:
 *       200:
 *         description: Public user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { type: object }
 *       401: { description: Missing or invalid X-API-Key }
 *       404: { description: User not found or profile is private }
 */
router.get('/users/:id', getUser);

/**
 * @openapi
 * /public/leaderboard:
 *   get:
 *     tags: [Public API]
 *     summary: Game leaderboard (public profiles only)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: gameType
 *         schema: { type: string, default: spit_royale }
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *       - $ref: '#/components/parameters/anonymizedParam'
 *     responses:
 *       200:
 *         description: Leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId: { type: integer }
 *                       username: { type: string }
 *                       elo: { type: integer }
 *                       wins: { type: integer }
 *                       losses: { type: integer }
 *                       draws: { type: integer }
 */
router.get('/leaderboard', getLeaderboard);

/**
 * @openapi
 * /public/posts:
 *   get:
 *     tags: [Public API]
 *     summary: Public feed posts (read-only, no viewer-specific flags)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *       - $ref: '#/components/parameters/anonymizedParam'
 *     responses:
 *       200:
 *         description: Posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       author_id: { type: integer, nullable: true }
 *                       author_username: { type: string }
 *                       content: { type: string }
 *                       likes_count: { type: integer }
 *                       comments_count: { type: integer }
 *                       reposts_count: { type: integer }
 *                       created_at: { type: string, format: date-time }
 *   post:
 *     tags: [Public API]
 *     summary: Create a post on behalf of a user (service-level write)
 *     description: Intended for server-to-server integrations. The caller must supply `authorId`.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, authorId]
 *             properties:
 *               authorId: { type: integer, example: 42 }
 *               content: { type: string, maxLength: 2000, example: "Posted via API" }
 *               imageUrl: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 */
router.get('/posts', getPosts);
router.post('/posts', validate({
  body: z.object({
    content:  z.string({ required_error: 'content is required' }).trim().min(1, 'content is required').max(5000),
    authorId: z.preprocess((v) => (v != null) ? Number(v) : v, z.number({ required_error: 'authorId is required', invalid_type_error: 'authorId is required' }).int().positive()),
    imageUrl: imageUrlSchema,
  }),
}), createPost);

/**
 * @openapi
 * /public/posts/{id}:
 *   put:
 *     tags: [Public API]
 *     summary: Update a post (service-level write, no ownership restriction)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, maxLength: 2000 }
 *               imageUrl: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 *       404: { description: Post not found }
 *   delete:
 *     tags: [Public API]
 *     summary: Delete a post (service-level write, no ownership restriction)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Post deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       404: { description: Post not found }
 */
router.put('/posts/:id', validate({
  params: z.object({ id: positiveId }),
  body:   z.object({
    content:  z.string().min(1).max(5000).trim().optional(),
    imageUrl: imageUrlSchema,
  }),
}), updatePost);
router.delete('/posts/:id', validate({ params: z.object({ id: positiveId }) }), deletePost);

/**
 * @openapi
 * /public/organizations:
 *   get:
 *     tags: [Public API]
 *     summary: List organizations (no owner ID or internal fields exposed)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *       - $ref: '#/components/parameters/anonymizedParam'
 *     responses:
 *       200:
 *         description: Organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       name: { type: string }
 *                       description: { type: string, nullable: true }
 *                       avatar: { type: string, nullable: true }
 *                       created_at: { type: string, format: date-time }
 */
router.get('/organizations', listOrganizations);

/**
 * @openapi
 * /public/mock:
 *   get:
 *     tags: [Public API]
 *     summary: Fully anonymized mock dataset for integration testing
 *     description: Returns a snapshot of real data with all usernames, avatars, and content replaced by placeholder values. Safe to embed in demos or documentation.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Mock dataset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users: { type: array }
 *                 leaderboard: { type: array }
 *                 posts: { type: array }
 *                 organizations: { type: array }
 *                 disclaimer: { type: string, example: "Mock dataset is anonymized and is not user personal data." }
 */
router.get('/mock', getMockDataset);

export default router;
