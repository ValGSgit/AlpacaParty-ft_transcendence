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

const router = express.Router();

router.get('/', optionalAuth, getFeed);
router.get('/user/:userId', optionalAuth, getUserPosts);
router.get('/:id', optionalAuth, getPost);

router.post('/', authenticate, createPost);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, likePost);
router.delete('/:id/like', authenticate, unlikePost);

router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/comments', authenticate, createComment);
router.delete('/:id/comments/:commentId', authenticate, deleteComment);

router.post('/:id/repost', authenticate, repostPost);
router.delete('/:id/repost', authenticate, unrepostPost);

export default router;
