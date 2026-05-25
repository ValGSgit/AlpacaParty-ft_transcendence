/**
 * Comment Controller
 */
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Friend from '../models/Friend.js';
import prisma from '#config/prisma.js';
import NotificationService from '../services/notificationService.js';
import { debug } from '#lib/logger.js';

async function blocked(req, authorId) {
  if (!req.user || req.user.id === authorId) return false;
  return Friend.isBlockedBetween(req.user.id, authorId);
}

/** GET /api/posts/:id/comments */
export const getComments = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const comments = await Comment.getByPost(req.params.id, { limit, offset });
    res.json({ comments });
  } catch (err) { next(err); }
};

/** POST /api/posts/:id/comments */
export const createComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: { message: 'content is required' } });
    if (content.length > 2000) return res.status(400).json({ error: { message: 'comment must be 2000 characters or fewer' } });

    const post = await Post.findById(Number(req.params.id));
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    if (await blocked(req, post.author_id))
      return res.status(404).json({ error: { message: 'Post not found' } });

    const comment = await Comment.create({ postId: post.id, authorId: req.user.id, content: content.trim() });

    if (post.author_id !== req.user.id) {
      NotificationService.postCommented(post.author_id, req.user.username, post.id).catch((err) => { debug("notification error (postCommented):", err.message); });
    }

    res.status(201).json({ comment });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:id/comments/:commentId */
export const deleteComment = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
    const deleted = await Comment.delete(Number(req.params.commentId), req.user.id, { isAdmin });
    if (!deleted) return res.status(404).json({ error: { message: 'Comment not found or not yours' } });
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
};
