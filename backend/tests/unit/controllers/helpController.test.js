/**
 * Help Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// We need to mock global fetch
const originalFetch = globalThis.fetch;

const { chat, chatStream } = await import('../../../src/controllers/helpController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.flushHeaders = jest.fn();
  res.write = jest.fn();
  res.end = jest.fn();
  res.headersSent = false;
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('chat', () => {
  test('should return 400 when messages is missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'messages array is required' } });
  });

  test('should return 400 when messages is empty array', async () => {
    const req = { body: { messages: [] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 400 when messages is not an array', async () => {
    const req = { body: { messages: 'hello' } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 503 when GROQ_API_KEY is not set', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Help service is not configured' } });
    if (originalKey) process.env.GROQ_API_KEY = originalKey;
  });

  test('should return reply on successful API call', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello there!' } }] }),
    });
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ reply: 'Hello there!' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
        }),
      }),
    );
    delete process.env.GROQ_API_KEY;
  });

  test('should return 502 when API responds with error', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Help service temporarily unavailable' } });
    delete process.env.GROQ_API_KEY;
  });

  test('should return fallback message when choices are empty', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ reply: 'Sorry, I could not generate a response.' });
    delete process.env.GROQ_API_KEY;
  });

  test('should limit messages to last 20 and truncate content to 2000 chars', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const longContent = 'a'.repeat(3000);
    const messages = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: longContent }));
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    const req = { body: { messages } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    const fetchCall = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    // system prompt + 20 user messages
    expect(body.messages).toHaveLength(21);
    // Each user message content should be truncated to 2000
    expect(body.messages[1].content.length).toBe(2000);
    delete process.env.GROQ_API_KEY;
  });

  test('should call next on unexpected error', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chat(req, res, next);
    expect(next).toHaveBeenCalled();
    delete process.env.GROQ_API_KEY;
  });
});

describe('chatStream', () => {
  test('should return 400 when messages is missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    const next = jest.fn();
    await chatStream(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 503 when GROQ_API_KEY is not set', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chatStream(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    if (originalKey) process.env.GROQ_API_KEY = originalKey;
  });

  test('should return 502 when API responds with error', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error',
    });
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chatStream(req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    delete process.env.GROQ_API_KEY;
  });

  test('should set SSE headers and stream tokens', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    let chunkIndex = 0;
    const mockReader = {
      read: jest.fn().mockImplementation(async () => {
        if (chunkIndex < chunks.length) {
          const value = new TextEncoder().encode(chunks[chunkIndex++]);
          return { done: false, value };
        }
        return { done: true };
      }),
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    const next = jest.fn();
    await chatStream(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(res.write).toHaveBeenCalledWith('data: {"token":"Hello"}\n\n');
    expect(res.write).toHaveBeenCalledWith('data: {"token":" world"}\n\n');
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
    expect(res.end).toHaveBeenCalled();
    delete process.env.GROQ_API_KEY;
  });

  test('should call next on error when headers not sent', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network fail'));
    const req = { body: { messages: [{ role: 'user', content: 'hi' }] } };
    const res = mockRes();
    res.headersSent = false;
    const next = jest.fn();
    await chatStream(req, res, next);
    expect(next).toHaveBeenCalled();
    delete process.env.GROQ_API_KEY;
  });
});
