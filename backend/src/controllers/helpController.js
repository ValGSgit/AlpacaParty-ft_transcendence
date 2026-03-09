/**
 * Help Controller — AI-powered help desk chat via Groq
 * @owner ValGSgit
 *
 * Uses the Groq API (OpenAI-compatible) with Llama 3 models.
 * Streams responses back to the client via Server-Sent Events.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are the friendly help assistant for **AlpacaParty** (also known as "Alpaca Party!"), a social web application where users can:

- Manage an alpaca farm (buy alpacas, earn coins, upgrade)
- Add friends, send direct messages, and join group chat rooms
- Create and join organisations
- Write public posts (a social feed)
- Earn achievements and XP
- Customise their profile (avatar, bio, status)

Your role:
1. Answer questions about how the app works.
2. Help troubleshoot common issues (login problems, friend requests, chat, game controls).
3. Be concise, warm, and helpful. Use short paragraphs.
4. If you don't know something specific about the app, say so honestly.
5. Do NOT answer questions unrelated to the application — politely redirect back to app help.
6. Format answers in Markdown when it helps (lists, bold, code).`;

/** POST /api/help/chat — non-streaming, returns full message */
export const chat = async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages array is required' } });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: { message: 'Help service is not configured' } });
    }

    // Build the conversation with system prompt
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-20).map(({ role, content }) => ({
        role: role === 'user' ? 'user' : 'assistant',
        content: String(content).slice(0, 2000),
      })),
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', response.status, err);
      return res.status(502).json({ error: { message: 'Help service temporarily unavailable' } });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    res.json({ reply });
  } catch (err) { next(err); }
};

/** POST /api/help/chat/stream — SSE streaming response */
export const chatStream = async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages array is required' } });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: { message: 'Help service is not configured' } });
    }

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-20).map(({ role, content }) => ({
        role: role === 'user' ? 'user' : 'assistant',
        content: String(content).slice(0, 2000),
      })),
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', response.status, err);
      return res.status(502).json({ error: { message: 'Help service temporarily unavailable' } });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) return next(err);
    res.end();
  }
};
