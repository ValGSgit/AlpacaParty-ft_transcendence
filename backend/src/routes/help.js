/**
 * Help Routes — /api/help
 * AI-powered help desk chat using Groq (Llama 3)
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { chat, chatStream } from '../controllers/helpController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Stricter rate limit for LLM endpoints (per-user via JWT, falls back to IP)
const llmRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,
  message: 'Too many AI requests, please wait before sending more.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Require auth so we know who's asking
router.use(authenticate);
router.use(llmRateLimit);

router.post('/chat', chat);
router.post('/chat/stream', chatStream);

export default router;
