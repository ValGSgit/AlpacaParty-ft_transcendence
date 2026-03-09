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

/** GET /api/public/users?search=&limit=20&offset=0 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    let users;
    if (search) {
      users = await User.search(search, { limit: Number(limit), offset: Number(offset) });
    } else {
      users = await User.findAll({ limit: Number(limit), offset: Number(offset) });
    }
    // Strip private profiles
    res.json({ users: users.filter((u) => u.is_public) });
  } catch (err) { next(err); }
};

/** GET /api/public/users/:id */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(Number(req.params.id));
    if (!user || !user.is_public) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ user });
  } catch (err) { next(err); }
};

/** GET /api/public/leaderboard?gameType=pong */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { gameType = 'pong', limit = 20, offset = 0 } = req.query;
    const leaderboard = await Game.getLeaderboard(gameType, { limit: Number(limit), offset: Number(offset) });
    res.json({ leaderboard });
  } catch (err) { next(err); }
};

/** GET /api/public/posts?limit=20&offset=0 */
export const getPosts = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const posts = await Post.getFeed({ limit: Number(limit), offset: Number(offset) });
    res.json({ posts });
  } catch (err) { next(err); }
};

/** GET /api/public/organizations?search=&limit=20 */
export const listOrganizations = async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const orgs = search
      ? await Organization.search(search, { limit: Number(limit) })
      : await Organization.findAll({ limit: Number(limit), offset: Number(offset) });
    res.json({ organizations: orgs });
  } catch (err) { next(err); }
};
