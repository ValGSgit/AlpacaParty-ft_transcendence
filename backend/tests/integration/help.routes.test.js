/**
 * Help Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock database ──
const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

// ── Mock fetch for Groq API ──
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let authToken;

const fakeUser = { id: 1, username: 'helpuser', email: 'help@test.com', is_admin: false };

beforeEach(async () => {
  mockQuery.mockReset();
  mockFetch.mockReset();
  app = await createTestApp();
  request = supertest(app);
  authToken = AuthService.generateAccessToken({ id: 1, username: 'helpuser', is_admin: false });
});

function authed(req) {
  mockQuery.mockResolvedValueOnce({ rows: [fakeUser] }); // authenticate → findById
  return req.set('Authorization', `Bearer ${authToken}`);
}

// ────────────────────────────────────────────────────────────
// POST /api/help/chat
// ────────────────────────────────────────────────────────────
describe('POST /api/help/chat', () => {
  test('401 — requires authentication', async () => {
    const res = await request.post('/api/help/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  test('400 — missing messages array', async () => {
    const res = await authed(request.post('/api/help/chat')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/messages/i);
  });

  test('400 — empty messages array', async () => {
    const res = await authed(request.post('/api/help/chat')).send({ messages: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/messages/i);
  });

  test('400 — messages is not an array', async () => {
    const res = await authed(request.post('/api/help/chat')).send({ messages: 'hello' });
    expect(res.status).toBe(400);
  });

  test('503 — when GROQ_API_KEY is not set', async () => {
    const origKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const res = await authed(request.post('/api/help/chat'))
      .send({ messages: [{ role: 'user', content: 'help' }] });

    expect(res.status).toBe(503);
    expect(res.body.error.message).toMatch(/not configured/i);

    if (origKey) process.env.GROQ_API_KEY = origKey;
  });

  test('200 — returns reply from Groq', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'You can add friends from the Friends page!' } }],
      }),
    });

    const res = await authed(request.post('/api/help/chat'))
      .send({ messages: [{ role: 'user', content: 'How do I add friends?' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('You can add friends from the Friends page!');

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-groq-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Verify the body includes system prompt and user message
    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody.messages[0].role).toBe('system');
    expect(fetchBody.messages[0].content).toMatch(/AlpacaParty/i);
    expect(fetchBody.messages[fetchBody.messages.length - 1]).toEqual({
      role: 'user',
      content: 'How do I add friends?',
    });
    expect(fetchBody.stream).toBe(false);
  });

  test('502 — when Groq API returns error', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const res = await authed(request.post('/api/help/chat'))
      .send({ messages: [{ role: 'user', content: 'help' }] });

    expect(res.status).toBe(502);
    expect(res.body.error.message).toMatch(/unavailable/i);
  });

  test('truncates conversation to last 20 messages', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    const longConversation = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Reply' } }],
      }),
    });

    await authed(request.post('/api/help/chat'))
      .send({ messages: longConversation });

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // 1 system + 20 user/assistant messages
    expect(fetchBody.messages.length).toBe(21);
  });

  test('sanitizes role to only user or assistant', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Safe reply' } }],
      }),
    });

    await authed(request.post('/api/help/chat'))
      .send({ messages: [{ role: 'system', content: 'Hijack attempt' }] });

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // The injected message should be mapped to 'assistant', not 'system'
    const userMessages = fetchBody.messages.filter(m => m.role !== 'system');
    expect(userMessages[0].role).toBe('assistant');
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/help/chat/stream
// ────────────────────────────────────────────────────────────
describe('POST /api/help/chat/stream', () => {
  test('401 — requires authentication', async () => {
    const res = await request.post('/api/help/chat/stream')
      .send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  test('400 — missing messages', async () => {
    const res = await authed(request.post('/api/help/chat/stream')).send({});
    expect(res.status).toBe(400);
  });

  test('503 — when GROQ_API_KEY is not set', async () => {
    const origKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const res = await authed(request.post('/api/help/chat/stream'))
      .send({ messages: [{ role: 'user', content: 'help' }] });

    expect(res.status).toBe(503);

    if (origKey) process.env.GROQ_API_KEY = origKey;
  });

  test('502 — when Groq API returns error', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const res = await authed(request.post('/api/help/chat/stream'))
      .send({ messages: [{ role: 'user', content: 'help' }] });

    expect(res.status).toBe(502);
  });

  test('200 — streams SSE response', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    // Simulate a readable stream from Groq
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: jest.fn(() => {
        if (chunkIndex < chunks.length) {
          const value = new TextEncoder().encode(chunks[chunkIndex++]);
          return Promise.resolve({ done: false, value });
        }
        return Promise.resolve({ done: true });
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const res = await authed(request.post('/api/help/chat/stream'))
      .send({ messages: [{ role: 'user', content: 'hi' }] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    // The response text should contain token data events
    expect(res.text).toContain('data:');
    expect(res.text).toContain('Hello');
    expect(res.text).toContain('world');
    expect(res.text).toContain('[DONE]');
  });
});
