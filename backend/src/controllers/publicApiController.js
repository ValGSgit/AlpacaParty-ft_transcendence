/**
 * Public API Controller — documented endpoints with API key auth
 * @owner ValGSgit
 *
 * Endpoints:
 *   GET    /api/public/users          — list public users
 *   GET    /api/public/users/:id      — get a public user profile
 *   GET    /api/public/leaderboard    — game leaderboard
 *   GET    /api/public/posts          — public feed
 *   GET    /api/public/organizations  — list organizations
 */
import User from '../models/User.js';
import Game from '../models/Game.js';
import Post from '../models/Post.js';
import Organization from '../models/Organization.js';

const anonymizeName = (id) => `user_${String(id).padStart(4, '0')}`;
const maskAvatar = '/avatars/default.svg';

const toPublicUser = (user, anonymize = false) => ({
  id: user.id,
  username: anonymize ? anonymizeName(user.id) : user.username,
  avatar: anonymize ? maskAvatar : user.avatar,
  bio: anonymize ? 'Anonymized profile for public API testing' : user.bio,
  status: anonymize ? 'Anonymized' : user.status,
  level: user.level,
  xp: user.xp,
  isOnline: user.isOnline,
  createdAt: user.createdAt,
});

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
    res.json({ users: users.filter((u) => u.isPublic).map((u) => toPublicUser(u, anonymize)) });
  } catch (err) { next(err); }
};

/** GET /api/public/users/:id */
export const getUser = async (req, res, next) => {
  try {
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    const user = await User.findById(Number(req.params.id));
    if (!user || !user.isPublic) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ user: toPublicUser(user, anonymize) });
  } catch (err) { next(err); }
};

/** GET /api/public/leaderboard?gameType=pong */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { gameType = 'pong', limit = 20, offset = 0 } = req.query;
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
    const shaped = posts.map((p) => ({
      ...p,
      authorUsername: anonymize ? anonymizeName(p.authorId) : p.authorUsername,
      authorAvatar: anonymize ? maskAvatar : p.authorAvatar,
      content: anonymize ? '[anonymized post content]' : p.content,
    }));
    res.json({ posts: shaped });
  } catch (err) { next(err); }
};

/** GET /api/public/organizations?search=&limit=20 */
export const listOrganizations = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const anonymize = ['1', 'true', 'yes'].includes(String(req.query.anonymized || '').toLowerCase());
    const orgs = search
      ? await Organization.search(search, { limit: Number(limit) })
      : await Organization.findAll({ limit: Number(limit), offset: Number(offset) });
    const shaped = anonymize
      ? orgs.map((org) => ({ ...org, name: `org_${org.id}`, description: 'Anonymized organization' }))
      : orgs;
    res.json({ organizations: shaped });
  } catch (err) { next(err); }
};

/** GET /api/public/mock */
export const getMockDataset = async (req, res, next) => {
  try {
    const [users, leaderboard, posts, organizations] = await Promise.all([
      User.findAll({ limit: 10, offset: 0 }),
      Game.getLeaderboard('pong', { limit: 10, offset: 0, publicOnly: true }),
      Post.getFeed({ limit: 10, offset: 0 }),
      Organization.findAll({ limit: 10, offset: 0 }),
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
        authorId: p.authorId,
        authorUsername: anonymizeName(p.authorId),
        authorAvatar: maskAvatar,
        content: '[anonymized post content]',
        createdAt: p.createdAt,
        likesCount: p.likesCount,
      })),
      organizations: organizations.map((org) => ({
        id: org.id,
        name: `org_${org.id}`,
        description: 'Anonymized organization',
      })),
      disclaimer: 'Mock dataset is anonymized and is not user personal data.',
    });
  } catch (err) { next(err); }
};
