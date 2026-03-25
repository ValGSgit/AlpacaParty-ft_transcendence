/**
 * Public API Key Middleware
 * @owner ValGSgit
 *
 * Expects the header:  X-API-Key: <key>
 * Valid keys are managed via Vault → config.apiKeys (getter).
 */
import config from '../config/index.js';

export const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || !config.apiKeys.has(key)) {
    return res.status(401).json({ error: { message: 'Invalid or missing API key' } });
  }
  next();
};
