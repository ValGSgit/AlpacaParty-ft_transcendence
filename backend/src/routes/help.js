/**
 * Help Routes — /api/help
 * AI-powered help desk chat using Groq (Llama 3)
 */
import express from 'express';
import { chat, chatStream } from '../controllers/helpController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Require auth so we know who's asking
router.use(authenticate);

router.post('/chat', chat);
router.post('/chat/stream', chatStream);

export default router;
