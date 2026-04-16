/**
 * Shared Socket.IO authentication middleware.
 * Validates JWT from handshake, attaches socket.user.
 * Reuse across all game namespaces and the default namespace.
 */
import AuthService from './authService.js';
import User from '../models/User.js';

export function socketAuthMiddleware() {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = AuthService.verifyToken(token);
      if (!decoded || decoded.type === 'refresh') return next(new Error('Invalid token'));

      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
