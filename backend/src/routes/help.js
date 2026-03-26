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

/**
 * @openapi
 * /help/chat:
 *   post:
 *     tags: [Help]
 *     summary: Send a message to the AI help assistant (Llama 3.3 70B via Groq)
 *     description: |
 *       The assistant has knowledge of AlpacaParty rules, game mechanics, and platform features.
 *       Rate limited to **20 requests per minute** per user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "How do I win at Spit Royale?"
 *               history:
 *                 type: array
 *                 description: Previous conversation turns for context (optional)
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *     responses:
 *       200:
 *         description: AI response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply: { type: string, example: "In Spit Royale, the fastest player to slap the center pile wins..." }
 *       429: { description: Rate limit exceeded }
 */
router.post('/chat', chat);

/**
 * @openapi
 * /help/chat/stream:
 *   post:
 *     tags: [Help]
 *     summary: Stream an AI help response (Server-Sent Events)
 *     description: |
 *       Same as `POST /help/chat` but streams the response token-by-token using **Server-Sent Events**.
 *       The client should use `EventSource` or `fetch` with a `ReadableStream` consumer.
 *
 *       Each SSE event has `data: <token>` and the stream ends with `data: [DONE]`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 2000, example: "What are the game rules?" }
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *     responses:
 *       200:
 *         description: SSE stream of tokens
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: Hello\ndata: world\ndata: [DONE]\n\n"
 *       429: { description: Rate limit exceeded }
 */
router.post('/chat/stream', chatStream);

export default router;
