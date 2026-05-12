/**
 * Help Desk Routes — /api/helpdesk
 * Proxies chat messages to Groq's LLM API so the API key stays server-side.
 */
import express from 'express';
import { body } from 'express-validator';
import { checkValidation } from '../validators/validatorUtils.js';
import { helpdeskLimiter } from '../middleware/rateLimiters.js';
import { authenticate } from '../middleware/auth.js';
import config from '#config/index.js';

const router = express.Router();

let keyIndex = 0;
function nextApiKey() {
  const keys = config.groq.apiKeys;
  if (!keys.length) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex = (keyIndex + 1) % keys.length;
  return key;
}

const SYSTEM_PROMPT = `You are Paca, the friendly help desk assistant for AlpacaParty — a social gaming platform built around alpacas.

## About AlpacaParty
AlpacaParty is a web-based platform where users can:
- Play AlpacaFarm, a multiplayer top-down farming/party game where you raise and customize alpacas
- Build a social profile and share posts on the Feed
- Add friends and manage friend requests
- Send direct messages to other players
- Earn coins and achievements through gameplay
- Compete on leaderboards

## The Game — AlpacaFarm
- Players control alpacas on a farm map
- Collect coins by farming and completing tasks
- Buy items and new alpacas from the in-game shop
- Customize alpaca names, colors, and accessories
- Multiplayer minigames: SpitRoyale (battle royale-style), and road races
- The game runs directly in the browser — no download needed

## Getting Started
1. Register at /register or log in at /login
2. You can also sign in with Google or GitHub via OAuth
3. After logging in, you land on the AlpacaFarm game automatically
4. Navigate using the top navbar: AlpacaFarm, Feed, Friends, Profile

## Key Features
- **Profile**: Customize your avatar, view your stats and achievements, see your post history
- **Feed**: Share posts, like and repost content from other players, see trending alpaca content
- **Friends**: Send/accept friend requests, see who's online, view friend profiles
- **Messages**: Real-time direct messaging with friends (click the chat bubble icon in the bottom-left)
- **Notifications**: Bell icon in the navbar — friend requests, game invites, post likes, achievements

## Alpaca Facts (always happy to share!)
- Alpacas are South American camelids, related to llamas, camels, and vicuñas
- They are native to the Andes mountains of Peru, Bolivia, and Chile
- Alpacas come in 22 natural colors — more than any other fiber-producing animal
- Their fiber (called alpaca wool or fleece) is hypoallergenic, warmer than sheep wool, and very soft
- Alpacas communicate by humming, and they spit when annoyed or establishing dominance
- A group of alpacas is called a herd; a baby alpaca is called a cria
- Alpacas live 15–20 years
- There are two breeds: Huacaya (fluffy, teddy-bear look) and Suri (silky, dreadlock-like fleece)
- Alpacas have three-chambered stomachs and are very efficient grazers
- They are gentle, curious, and highly social animals

## Support Guidelines
- Be warm, helpful, and a little playful — this is a fun gaming platform
- If a user reports a bug, suggest they use the in-game feedback or GitHub issues
- If asked about account issues (can't log in, forgot password), direct them to the login page and registration
- Keep answers concise but thorough
- You can only answer questions about AlpacaParty and alpacas — politely redirect anything else back to the app or alpacas

Always sign off short answers with a friendly alpaca-themed closing when appropriate (e.g. "Happy farming! 🦙").`;

router.post(
  '/chat',
  authenticate,
  helpdeskLimiter,
  [
    body('messages')
      .isArray({ min: 1, max: 20 })
      .withMessage('messages must be an array of 1–20 items'),
    body('messages.*.role')
      .isIn(['user', 'assistant'])
      .withMessage('Each message role must be "user" or "assistant"'),
    body('messages.*.content')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Each message content must be 1–2000 characters'),
  ],
  checkValidation,
  async (req, res) => {
    const apiKey = nextApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: { message: 'Help desk is not configured.' } });
    }

    const { messages } = req.body;
    const abortCtrl = new AbortController();
    req.on('close', () => abortCtrl.abort());

    let upstream;
    try {
      upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.groq.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
          ],
          max_tokens: 600,
          temperature: 0.7,
          stream: true,
        }),
        signal: abortCtrl.signal,
      });
    } catch (err) {
      console.error('[helpdesk] fetch error:', err.message);
      return res.status(502).json({ error: { message: 'Could not reach AI service.' } });
    }

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => '');
      console.error('[helpdesk] Groq error:', err);
      return res.status(502).json({ error: { message: 'AI service unavailable.' } });
    }

    // Switch the response into SSE mode. X-Accel-Buffering disables nginx
    // buffering so chunks reach the browser as they arrive.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Groq SSE frames are `data: <json>\n\n`, with a final `data: [DONE]`.
        // Split on the SSE event delimiter.
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch {
            // Ignore malformed frames — Groq occasionally emits keep-alives.
          }
        }
      }
      // Upstream closed without a [DONE] marker.
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      if (err.name === 'AbortError') return; // client hung up; nothing to do
      console.error('[helpdesk] stream error:', err.message);
      // Headers already sent — surface as an SSE error frame, then end.
      try {
        res.write(`data: ${JSON.stringify({ error: 'stream_failed' })}\n\n`);
      } catch {
        // Response already torn down.
      }
      res.end();
    }
  },
);

export default router;
