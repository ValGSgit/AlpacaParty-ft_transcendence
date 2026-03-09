/**
 * Public API Key Middleware
 * @owner ValGSgit
 *
 * Expects the header:  X-API-Key: <key>
 * API keys are stored as a comma-separated env var:
 *   API_KEYS=key1,key2,key3
 */

const validKeys = new Set(
  (process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean),
);

export const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || !validKeys.has(key)) {
    return res.status(401).json({ error: { message: 'Invalid or missing API key' } });
  }
  next();
};
