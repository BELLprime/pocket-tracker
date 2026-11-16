import { config } from '../config.js';

// Block requests without a valid x-api-key header
export function requireApiKey(req, res, next) {
  // Local dev without a key configured: allow
  if (!config.apiKey && !config.isProd) return next();
  // Prod without a key configured: lock everything
  if (!config.apiKey) return res.status(503).json({ error: 'API disabled' });
  if (req.get('x-api-key') !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}