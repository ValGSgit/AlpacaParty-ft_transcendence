/**
 * Post Routes — /api/posts
 */
import express from 'express';
import {
  getFeed, getUserPosts, createPost, getPost,
  updatePost, deletePost, likePost, unlikePost,
} from '../controllers/postController.js';
import {
  getComments, createComment, deleteComment,
  repostPost, unrepostPost,
} from '../controllers/commentController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, z } from '../middleware/validate.js';
import { positiveId, paginationQuery, imageUrlSchema } from '../schemas/shared.js';

const router = express.Router();

/**
 * @openapi
 * /posts:
 *   get:
 *     tags: [Posts]
 *     summary: Get the social feed (public posts + friends' posts if authenticated)
 *     security: [{}]
 *     parameters:
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Feed posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts: { type: array, items: { $ref: '#/components/schemas/Post' } }
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 2000, example: "Just won my first Spit Royale! 🏆" }
 *               imageUrl: { type: string, nullable: true, example: "/uploads/screenshot.png" }
 *               is_public: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 *       400: { description: content is required }
 */
router.get('/', optionalAuth, validate({ query: paginationQuery }), getFeed);
router.post('/', authenticate, validate({
  body: z.object({
    content:   z.string({ required_error: 'content is required' }).trim().min(1, 'content is required').max(5000, 'content must be 5000 characters or fewer'),
    imageUrl:  imageUrlSchema,
    image_url: imageUrlSchema,
    isPublic:  z.boolean().optional(),
  }).passthrough(),
}), createPost);

/**
 * @openapi
 * /posts/user/{userId}:
 *   get:
 *     tags: [Posts]
 *     summary: Get posts by a specific user
 *     security: [{}]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: User's posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts: { type: array, items: { $ref: '#/components/schemas/Post' } }
 */
router.get('/user/:userId', optionalAuth, validate({
  params: z.object({ userId: positiveId }),
  query:  paginationQuery,
}), getUserPosts);

/**
 * @openapi
 * /posts/{id}:
 *   get:
 *     tags: [Posts]
 *     summary: Get a single post
 *     security: [{}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 *       404: { description: Post not found }
 *   put:
 *     tags: [Posts]
 *     summary: Update my post
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
 *         description: Updated post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 *       403: { description: Not your post }
 *       404: { description: Post not found }
 *   delete:
 *     tags: [Posts]
 *     summary: Delete my post
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
 *       403: { description: Not your post }
 *       404: { description: Post not found }
 */
router.get('/:id', optionalAuth, validate({ params: z.object({ id: positiveId }) }), getPost);
router.put('/:id', authenticate, validate({
  params: z.object({ id: positiveId }),
  body: z.object({
    content:   z.string().min(1).max(5000).trim().optional(),
    imageUrl:  imageUrlSchema,
    image_url: imageUrlSchema,
    isPublic:  z.boolean().optional(),
  }).passthrough(),
}), updatePost);
router.delete('/:id', authenticate, validate({ params: z.object({ id: positiveId }) }), deletePost);

/**
 * @openapi
 * /posts/{id}/like:
 *   post:
 *     tags: [Posts]
 *     summary: Like a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 likes_count: { type: integer }
 *       409: { description: Already liked }
 *   delete:
 *     tags: [Posts]
 *     summary: Unlike a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Unliked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 likes_count: { type: integer }
 */
router.post('/:id/like', authenticate, validate({ params: z.object({ id: positiveId }) }), likePost);
router.delete('/:id/like', authenticate, validate({ params: z.object({ id: positiveId }) }), unlikePost);

/**
 * @openapi
 * /posts/{id}/comments:
 *   get:
 *     tags: [Posts]
 *     summary: Get comments on a post
 *     security: [{}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments: { type: array, items: { $ref: '#/components/schemas/Comment' } }
 *   post:
 *     tags: [Posts]
 *     summary: Add a comment to a post
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
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 1000, example: "GG! 🎉" }
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment: { $ref: '#/components/schemas/Comment' }
 */
router.get('/:id/comments', optionalAuth, validate({
  params: z.object({ id: positiveId }),
  query:  paginationQuery,
}), getComments);
router.post('/:id/comments', authenticate, validate({
  params: z.object({ id: positiveId }),
  body:   z.object({ content: z.string().min(1, 'content is required').max(2000, 'comment must be 2000 characters or fewer').trim() }),
}), createComment);

/**
 * @openapi
 * /posts/{id}/comments/{commentId}:
 *   delete:
 *     tags: [Posts]
 *     summary: Delete a comment (own comment, or post owner, or admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403: { description: Not authorized }
 *       404: { description: Comment not found }
 */
router.delete('/:id/comments/:commentId', authenticate, validate({
  params: z.object({ id: positiveId, commentId: positiveId }),
}), deleteComment);

/**
 * @openapi
 * /posts/{id}/repost:
 *   post:
 *     tags: [Posts]
 *     summary: Repost a post (optionally with a comment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment: { type: string, maxLength: 500, nullable: true, example: "Must see this!" }
 *     responses:
 *       201:
 *         description: Reposted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reposts_count: { type: integer }
 *       409: { description: Already reposted }
 *   delete:
 *     tags: [Posts]
 *     summary: Remove a repost
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Repost removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reposts_count: { type: integer }
 */
router.post('/:id/repost', authenticate, validate({
  params: z.object({ id: positiveId }),
  body:   z.object({ comment: z.string().max(500, 'repost comment must be 500 characters or fewer').nullable().optional() }),
}), repostPost);
router.delete('/:id/repost', authenticate, validate({ params: z.object({ id: positiveId }) }), unrepostPost);

export default router;
