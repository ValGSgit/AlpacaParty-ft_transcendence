/**
 * Comment & Repost Controller
 */
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import prisma from '#config/prisma.js';
import NotificationService from '../services/notificationService.js';
import { stripDangerousHtml } from '../utils/htmlSanitizer.js';
import { debug } from '#lib/logger.js';

/** GET /api/posts/:id/comments */
export const getComments = async (req, res, next) => {
  try {
    const thread = req.query.thread || 'post';
    const { limit = 50, offset = 0 } = req.query;
    const comments = thread === 'repost' && typeof Comment.getByThread === 'function'
      ? await Comment.getByThread({ repostId: Number(req.params.id), limit, offset })
      : await Comment.getByPost(req.params.id, { limit, offset });
    res.json({ comments });
  } catch (err) { next(err); }
};

/** POST /api/posts/:id/comments */
export const createComment = async (req, res, next) => {
  try {
    const thread = req.query.thread || 'post';
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: { message: 'content is required' } });
    if (content.length > 2000) return res.status(400).json({ error: { message: 'comment must be 2000 characters or fewer' } });

    if (thread === 'repost') {
      const repost = await prisma.repost.findUnique({
        where: { id: Number(req.params.id) },
        include: { author: true },
      });
      if (!repost) return res.status(404).json({ error: { message: 'Repost not found' } });

      const comment = await Comment.create({ repostId: repost.id, authorId: req.user.id, content: stripDangerousHtml(content.trim()) });
      if (repost.authorId !== req.user.id) {
        NotificationService.postCommented(repost.authorId, req.user.username, repost.postId || repost.id).catch((err) => { debug("notification error (postCommented):", err.message); });
      }
      return res.status(201).json({ comment });
    }

    const post = await Post.findById(Number(req.params.id));
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });

    const comment = await Comment.create({ postId: post.id, authorId: req.user.id, content: stripDangerousHtml(content.trim()) });

    if (post.author_id !== req.user.id) {
      NotificationService.postCommented(post.author_id, req.user.username, post.id).catch((err) => { debug("notification error (postCommented):", err.message); });
    }

    res.status(201).json({ comment });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:id/comments/:commentId */
export const deleteComment = async (req, res, next) => {
  try {
    const deleted = await Comment.delete(Number(req.params.commentId), req.user.id);
    if (!deleted) return res.status(404).json({ error: { message: 'Comment not found or not yours' } });
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
};

/** POST /api/posts/:id/repost */
export const repostPost = async (req, res, next) => {
  try {
    const { comment = null } = req.body;
    if (comment && comment.length > 500) {
      return res.status(400).json({ error: { message: 'repost comment must be 500 characters or fewer' } });
    }
    const post = await Post.findById(Number(req.params.id));
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });

    const repost = await Post.repost(post.id, req.user.id, comment ? stripDangerousHtml(comment.trim()) : null);
    if (!repost) return res.status(409).json({ error: { message: 'Already reposted' } });

    res.status(201).json({ repost });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:id/repost */
export const unrepostPost = async (req, res, next) => {
  try {
    await Post.unrepost(Number(req.params.id), req.user.id);
    res.json({ message: 'Unreposted' });
  } catch (err) { next(err); }
};
