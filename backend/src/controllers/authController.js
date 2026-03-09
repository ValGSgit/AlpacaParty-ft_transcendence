/**
 * Auth Controller — handles registration, login, logout, token refresh, OAuth
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import AuthService from '../services/authService.js';
import { oauthTokensForUser } from '../services/oauthService.js';
import config from '../config/index.js';

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // --- Validate input ---
    if (!username || !email || !password) {
      return res.status(400).json({ error: { message: 'username, email and password are required' } });
    }

    if (username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: { message: 'Username must be 3-32 characters' } });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: { message: 'Username may only contain letters, numbers, hyphens and underscores' } });
    }

    const { valid, errors } = AuthService.validatePassword(password);
    if (!valid) {
      return res.status(400).json({ error: { message: errors.join('. ') } });
    }

    // --- Check uniqueness ---
    const [existingUsername, existingEmail] = await Promise.all([
      User.findByUsername(username),
      User.findByEmail(email),
    ]);

    if (existingUsername) {
      return res.status(409).json({ error: { message: 'Username already taken' } });
    }
    if (existingEmail) {
      return res.status(409).json({ error: { message: 'Email already registered' } });
    }

    // --- Create user ---
    const passwordHash = await AuthService.hashPassword(password);
    const user = await User.create({ username, email, passwordHash });

    // Unlock first-login achievement (non-blocking)
    Achievement.unlock(user.id, 'first_login').catch(() => {});

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: { message: 'username and password are required' } });
    }

    // Allow login with username or email
    let user = await User.findByUsername(username);
    if (!user) {
      user = await User.findByEmail(username);
    }
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const valid = await AuthService.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    // Mark user online
    await User.setOnline(user.id, true);

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Return user without password_hash
    const { password_hash, two_factor_secret, ...safeUser } = user;

    res.json({
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.setOnline(req.user.id, false);
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: { message: 'refreshToken is required' } });
    }

    const decoded = AuthService.verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: { message: 'Invalid refresh token' } });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: { message: 'User not found' } });
    }

    const accessToken = AuthService.generateAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me  — return the currently authenticated user
 */
export const me = async (req, res) => {
  res.json({ user: req.user });
};

/**
 * GET /api/auth/google/callback
 * GET /api/auth/github/callback
 * Passport fills req.user after strategy succeeds.
 * Redirect to frontend with JWT tokens in query params.
 */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  const frontendUrl = config.frontendUrl;
  res.redirect(
    `${frontendUrl}/oauth-callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`,
  );
};
