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

export const requireApiKey = async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: { message: 'Missing X-API-Key header' } });
  }

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
    // DB lookup failure — fall through to rejection.
  }

  return res.status(401).json({ error: { message: 'Invalid or missing API key' } });
};
