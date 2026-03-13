/**
 * Post Controller — social feed / posts
 * @owner ValGSgit
 */
import Post from '../models/Post.js';
import NotificationService from '../services/notificationService.js';
import GamificationService from '../services/gamificationService.js';

/** GET /api/posts — public feed */
export const getFeed = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const posts = await Post.getFeed({ limit: Number(limit), offset: Number(offset), viewerId: req.user?.id });
    res.json({ posts });
  } catch (err) { next(err); }
};

/** GET /api/posts/user/:userId — user's posts */
export const getUserPosts = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const posts = await Post.getByUser(Number(req.params.userId), { limit: Number(limit), offset: Number(offset) });
    res.json({ posts });
  } catch (err) { next(err); }
};

/** POST /api/posts */
export const createPost = async (req, res, next) => {
  try {
    const { content, imageUrl, isPublic = true } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: { message: 'content is required' } });
    if (content.length > 5000) return res.status(400).json({ error: { message: 'content must be 5000 characters or fewer' } });
    if (imageUrl && (typeof imageUrl !== 'string' || imageUrl.length > 2048)) {
      return res.status(400).json({ error: { message: 'invalid imageUrl' } });
    }
    const post = await Post.create({ authorId: req.user.id, content: content.trim(), imageUrl: imageUrl || null, isPublic: !!isPublic });
    await GamificationService.checkPostAchievements(req.user.id);
    res.status(201).json({ post });
  } catch (err) { next(err); }
};

/** GET /api/posts/:id */
export const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(Number(req.params.id));
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    res.json({ post });
  } catch (err) { next(err); }
};

/** PUT /api/posts/:id */
export const updatePost = async (req, res, next) => {
  try {
    const { content, imageUrl, isPublic } = req.body;
    if (content !== undefined && (!content?.trim() || content.length > 5000)) {
      return res.status(400).json({ error: { message: 'content must be between 1 and 5000 characters' } });
    }
    if (imageUrl !== undefined && imageUrl !== null && (typeof imageUrl !== 'string' || imageUrl.length > 2048)) {
      return res.status(400).json({ error: { message: 'invalid imageUrl' } });
    }
    const post = await Post.update(Number(req.params.id), req.user.id, {
      content: content?.trim(), image_url: imageUrl, is_public: isPublic,
    });
    if (!post) return res.status(404).json({ error: { message: 'Post not found or not yours' } });
    res.json({ post });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:id */
export const deletePost = async (req, res, next) => {
  try {
    const deleted = await Post.delete(Number(req.params.id), req.user.id);
    if (!deleted && !req.user.is_admin) return res.status(404).json({ error: { message: 'Post not found or not yours' } });
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
};

/** POST /api/posts/:id/like */
export const likePost = async (req, res, next) => {
  try {
    const post = await Post.findById(Number(req.params.id));
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    await Post.like(post.id, req.user.id);
    if (post.author_id !== req.user.id) {
      NotificationService.postLiked(post.author_id, req.user.username, post.id).catch(() => {});
    }
    res.json({ message: 'Liked' });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:id/like */
export const unlikePost = async (req, res, next) => {
  try {
    await Post.unlike(Number(req.params.id), req.user.id);
    res.json({ message: 'Unliked' });
  } catch (err) { next(err); }
};
