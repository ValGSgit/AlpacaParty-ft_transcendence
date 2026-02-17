/**
 * Auth Middleware — JWT verification
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/8
 */
import AuthService from '../services/authService.js';
import User from '../models/User.js';

/**
 * Require a valid access token.
 * Attaches `req.user` (full user row, no password_hash) on success.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);
    if (!decoded || decoded.type === 'refresh') {
      return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: { message: 'User not found' } });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — attaches req.user if a valid token is present, but doesn't
 * reject the request if there's no token.
 */
export const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = AuthService.verifyToken(token);
      if (decoded && decoded.type !== 'refresh') {
        req.user = await User.findById(decoded.id);
      }
    }
    next();
  } catch {
    next();
  }
};
