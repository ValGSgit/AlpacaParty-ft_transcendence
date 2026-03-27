/**
 * Auth Controller — handles registration, login, logout, token refresh, OAuth
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import User, { shapeUserForClient } from '../models/User.js';
import Achievement from '../models/Achievement.js';
import AuthService from '../services/authService.js';
import { oauthTokensForUser } from '../services/oauthService.js';
import config from '../config/index.js';

/** POST /api/auth/register */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const { valid, errors } = AuthService.validatePassword(password);
    if (!valid) return res.status(400).json({ error: { message: errors.join('. ') } });

    const [existingUsername, existingEmail] = await Promise.all([
      User.findByUsername(username),
      User.findByEmail(email),
    ]);
    if (existingUsername) return res.status(409).json({ error: { message: 'Username already taken' } });
    if (existingEmail)   return res.status(409).json({ error: { message: 'Email already registered' } });

    const passwordHash = await AuthService.hashPassword(password);
    const user = await User.create({ username, email, passwordHash });

    Achievement.unlock(user.id, 'first_login').catch(() => {});

    const accessToken  = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    res.status(201).json({ user: shapeUserForClient(user), accessToken, refreshToken });
  } catch (err) { next(err); }
};

/** POST /api/auth/login */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Allow login with username or email — findByUsername/Email returns full row (with passwordHash)
    let user = await User.findByUsername(username);
    if (!user) user = await User.findByEmail(username);
    if (!user) return res.status(401).json({ error: { message: 'Invalid credentials' } });

    const valid = await AuthService.comparePassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: { message: 'Invalid credentials' } });

    await User.setOnline(user.id, true);

    const accessToken  = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Strip sensitive fields before returning
    const { passwordHash, ...safeUser } = user;

    res.json({ user: shapeUserForClient(safeUser), accessToken, refreshToken });
  } catch (err) { next(err); }
};

/** POST /api/auth/logout */
export const logout = async (req, res, next) => {
  try {
    if (req.user) await User.setOnline(req.user.id, false);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
};

/** POST /api/auth/refresh */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = AuthService.verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: { message: 'Invalid refresh token' } });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: { message: 'User not found' } });

    const accessToken    = AuthService.generateAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
};

/** GET /api/auth/me */
export const me = async (req, res) => res.json({ user: shapeUserForClient(req.user) });

/** OAuth callback (Google / GitHub) */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  res.redirect(
    `${config.frontendUrl}/oauth-callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`,
  );
};
