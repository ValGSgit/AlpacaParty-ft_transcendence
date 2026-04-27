/**
 * Public API Controller — documented endpoints with API key auth
 * @owner ValGSgit
 *
 * Endpoints:
 *   GET    /api/public/users          — list public users
 *   GET    /api/public/users/:id      — get a public user profile
 *   GET    /api/public/leaderboard    — game leaderboard
 *   GET    /api/public/posts          — public feed
 */
import User from '../models/User.js';
import Game from '../models/Game.js';
import Post from '../models/Post.js';
// import Organization from '../models/Organization.js';

const anonymizeName = (id) => `user_${String(id).padStart(4, '0')}`;
const maskAvatar = '/avatars/default.svg';

const toPublicUser = (user, anonymize = false) => ({
  id: user.id,
  username: anonymize ? anonymizeName(user.id) : user.username,
  avatar: anonymize ? maskAvatar : user.avatar,
  bio: anonymize ? 'Anonymized profile for public API testing' : user.bio,
  status: anonymize ? 'Anonymized' : user.status,
  is_online: user.isOnline,
  created_at: user.createdAt,
});

const isUserPublic = (user) => {
  if (typeof user?.isPublic === 'boolean') return user.isPublic;
  if (typeof user?.userSettings?.isPublic === 'boolean') {
    return user.userSettings.isPublic;
  }
  return true;
};

/** GET /api/public/users?search=&limit=20&offset=0 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    let users;
    if (search) {
      users = await User.search(search, { limit: Number(limit), offset: Number(offset) });
    } else {
      users = await User.findAll({ limit: Number(limit), offset: Number(offset) });
    }
    // Strip private profiles and remove sensitive fields.
    res.json({ users: users.filter((u) => isUserPublic(u)).map((u) => toPublicUser(u, anonymize)) });
  } catch (err) { next(err); }
};

/** GET /api/public/users/:id */
export const getUser = async (req, res, next) => {
  try {
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    const user = await User.findById(Number(req.params.id));
    if (!user || !isUserPublic(user)) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ user: toPublicUser(user, anonymize) });
  } catch (err) { next(err); }
};

/** GET /api/public/leaderboard?gameType=spit_royale */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { gameType = 'spit_royale', limit = 20, offset = 0 } = req.query;
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    const leaderboard = await Game.getLeaderboard(gameType, { limit: Number(limit), offset: Number(offset), publicOnly: true });
    const shaped = leaderboard.map((row) => ({
      ...row,
      username: anonymize ? anonymizeName(row.userId) : row.username,
      avatar: anonymize ? maskAvatar : row.avatar,
    }));
    res.json({ leaderboard: shaped });
  } catch (err) { next(err); }
};

/** GET /api/public/posts?limit=20&offset=0 */
export const getPosts = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    const posts = await Post.getFeed({ limit: Number(limit), offset: Number(offset) });
    // Explicit field selection — never expose user_liked, user_reposted, or other
    // viewer-specific flags that are meaningless and potentially leaky for API key callers.
    const shaped = posts.map((p) => ({
      id: p.id,
      author_id: anonymize ? null : p.author_id,
      author_username: anonymize ? anonymizeName(p.author_id) : p.author_username,
      author_avatar: anonymize ? maskAvatar : p.author_avatar,
      content: anonymize ? '[anonymized post content]' : p.content,
      image_url: p.image_url,
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      reposts_count: p.reposts_count,
      created_at: p.created_at,
    }));
    res.json({ posts: shaped });
  } catch (err) { next(err); }
};

/**
 * POST /api/public/posts — create a post via API key.
 *
 * Authorization rules:
 *   - Server-level keys may specify any authorId (service impersonation).
 *   - User-scoped keys / JWTs may only post as themselves; authorId is
 *     ignored and forced to req.apiKeyUserId.
 */
export const createPost = async (req, res, next) => {
  try {
    const { content, authorId, imageUrl } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: { message: 'content is required' } });
    if (content.length > 2000) return res.status(400).json({ error: { message: 'content must be 2000 characters or fewer' } });

    let effectiveAuthorId;
    if (req.isServerKey) {
      if (!authorId) return res.status(400).json({ error: { message: 'authorId is required for server-level calls' } });
      effectiveAuthorId = Number(authorId);
    } else {
      if (!req.apiKeyUserId) return res.status(403).json({ error: { message: 'Not authorized to create posts' } });
      effectiveAuthorId = Number(req.apiKeyUserId);
    }

    const post = await Post.create({
      authorId: effectiveAuthorId,
      content: content.trim(),
      imageUrl: imageUrl || null,
    });
    res.status(201).json({ post });
  } catch (err) { next(err); }
};

/**
 * PUT /api/public/posts/:id — update a post via API key.
 *
 * Server-level keys may update any post. User-scoped keys / JWTs may only
 * update posts they authored.
 */
export const updatePost = async (req, res, next) => {
  try {
    const { content, imageUrl } = req.body;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: { message: 'Invalid post id' } });
    if (!content?.trim() && imageUrl === undefined) {
      return res.status(400).json({ error: { message: 'Nothing to update' } });
    }

    const existing = await Post.findById(id);
    if (!existing) return res.status(404).json({ error: { message: 'Post not found' } });

    if (!req.isServerKey && Number(existing.author_id) !== Number(req.apiKeyUserId)) {
      return res.status(403).json({ error: { message: 'Cannot modify another user\'s post' } });
    }

    const post = await Post.update(id, existing.author_id, { content, imageUrl });
    res.json({ post });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/public/posts/:id — delete a post via API key.
 *
 * Server-level keys may delete any post. User-scoped keys / JWTs may only
 * delete posts they authored.
 */
export const deletePost = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: { message: 'Invalid post id' } });
    const existing = await Post.findById(id);
    if (!existing) return res.status(404).json({ error: { message: 'Post not found' } });

    if (!req.isServerKey && Number(existing.author_id) !== Number(req.apiKeyUserId)) {
      return res.status(403).json({ error: { message: 'Cannot delete another user\'s post' } });
    }

    await Post.delete(id, existing.author_id);
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
};

// /** GET /api/public/organizations?search=&limit=20 */
// export const listOrganizations = async (req, res, next) => {
//   try {
//     const { search, limit = 20, offset = 0 } = req.query;
//     const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
//     const orgs = search
//       ? await Organization.search(search, { limit: Number(limit) })
//       : await Organization.findAll({ limit: Number(limit), offset: Number(offset) });
//     // Explicit field selection — never expose ownerId or internal timestamps.
//     const shaped = orgs.map((org) => ({
//       id: org.id,
//       name: anonymize ? `org_${org.id}` : org.name,
//       description: anonymize ? 'Anonymized organization' : org.description,
//       avatar: anonymize ? maskAvatar : org.avatar,
//       memberCount: org.memberCount ?? 0,
//       created_at: org.createdAt ?? org.created_at,
//     }));
//     res.json({ organizations: shaped });
//   } catch (err) { next(err); }
// };

/** GET /api/public/mock */
export const getMockDataset = async (req, res, next) => {
  try {
    const [users, leaderboard, posts] = await Promise.all([
      User.findAll({ limit: 10, offset: 0 }),
      Game.getLeaderboard('spit_royale', { limit: 10, offset: 0, publicOnly: true }),
      Post.getFeed({ limit: 10, offset: 0 }),
    ]);

    res.json({
      users: users.filter((u) => u.isPublic).map((u) => toPublicUser(u, true)),
      leaderboard: leaderboard.map((row) => ({
        userId: row.userId,
        username: anonymizeName(row.userId),
        avatar: maskAvatar,
        elo: row.elo,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        author_id: p.author_id,
        author_username: anonymizeName(p.author_id),
        author_avatar: maskAvatar,
        content: '[anonymized post content]',
        created_at: p.created_at,
        likes_count: p.likes_count,
      })),
      disclaimer: 'Mock dataset is anonymized and is not user personal data.',
    });
  } catch (err) { next(err); }
};
