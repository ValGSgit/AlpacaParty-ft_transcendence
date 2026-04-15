/**
 * Public API Key Middleware
 * @owner ValGSgit
 *
 * Accepts two types of valid API keys:
 *   1. Server-level keys: comma-separated values in API_KEYS env var (Vault-managed).
 *   2. User-generated keys: stored per-user in user_settings.api_key.
 *
 * Header:  X-API-Key: <key>
 */
import config from '../config/index.js';
import User from '../models/User.js';
import AuthService from '../services/authService.js';

export const requireApiKey = async (req, res, next) => {
  const key = req.headers['x-api-key'];

  if (key) {
    // 1. Fast path: check static server-level keys (in-memory Set from env/Vault).
    if (config.apiKeys.has(key)) return next();

    // 2. Slow path: check user-generated keys stored in DB.
    try {
      const userId = await User.findByApiKey(key);
      if (userId) {
        req.apiKeyUserId = userId;
        return next();
      }
    } catch {
      // DB lookup failure — fall through.
    }
  }

  // 3. Fallback: accept a valid JWT Bearer token so authenticated users
  //    can also reach the public API without generating a separate key.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = AuthService.verifyToken(token);
      if (decoded && decoded.type !== 'refresh') {
        req.apiKeyUserId = decoded.id;
        return next();
      }
    } catch {
      // Invalid JWT — fall through to rejection.
    }
  }

  return res.status(401).json({ error: { message: 'Invalid or missing API key' } });
};
