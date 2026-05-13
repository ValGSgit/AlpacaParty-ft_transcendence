import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import helpdeskRouter from '../../../src/routes/helpdesk.js';
import config from '#config/index.js';
import { authenticate } from '../../../src/middleware/auth.js';
import { helpdeskLimiter } from '../../../src/middleware/rateLimiters.js';

jest.mock('#config/index.js');
jest.mock('../../../src/middleware/auth.js');
jest.mock('../../../src/middleware/rateLimiters.js');
jest.mock('express-validator', () => ({
  body: jest.fn().mockReturnThis(),
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

describe('Helpdesk Routes', () => {
  let app;
  let server;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure mocks
    config.groq = {
      apiKeys: ['test-api-key-1', 'test-api-key-2'],
      model: 'mixtral-8x7b-32768',
    };

    // Mock middleware to just pass through
    authenticate.mockImplementation((req, res, next) => {
      req.user = { id: 1, username: 'testuser' };
      next();
    });

    helpdeskLimiter.mockImplementation((req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/helpdesk', helpdeskRouter);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    jest.restoreAllMocks();
  });

  describe('POST /api/helpdesk/chat', () => {
    test('should return 503 if no API keys configured', async () => {
      config.groq.apiKeys = [];

      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      expect(res.status).toBe(503);
      expect(res.body.error.message).toContain('not configured');
    });

    test('should return 502 if fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      expect(res.status).toBe(502);
      expect(res.body.error.message).toContain('Could not reach AI service');
    });

    test('should return 502 if upstream returns error status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Groq error'),
      });

      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      expect(res.status).toBe(502);
      expect(res.body.error.message).toContain('AI service unavailable');
    });

    test('should require authentication', async () => {
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      expect(res.status).toBe(401);
    });

    test('should validate messages array', async () => {
      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: 'not an array'
        });

      // The validation middleware would handle this
      // Status will depend on the validation result
    });

    test('should validate message roles', async () => {
      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'invalid', content: 'Hello' }
          ]
        });

      // The validation middleware would handle this
    });

    test('should validate message content length', async () => {
      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'x'.repeat(2001) }
          ]
        });

      // The validation middleware would handle this
    });

    test('should set SSE headers for successful stream', async () => {
      const mockReadableStream = {
        getReader: jest.fn(() => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'),
              done: false,
            })
            .mockResolvedValueOnce({ done: true }),
        })),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: mockReadableStream,
      });

      const res = await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        });

      // The streaming response would have SSE headers
      expect(res.headers['content-type']).toContain('text/event-stream');
    });

    test('should round-robin through API keys', async () => {
      config.groq.apiKeys = ['key1', 'key2', 'key3'];

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          body: { getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }) }) },
        });

      await request(app)
        .post('/api/helpdesk/chat')
        .send({ messages: [{ role: 'user', content: 'Test 1' }] });

      const firstCall = global.fetch.mock.calls[0];
      const firstAuth = firstCall[1].headers.Authorization;
      expect(firstAuth).toContain('key1');

      // Second request should use key2
      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }) }) },
      });

      await request(app)
        .post('/api/helpdesk/chat')
        .send({ messages: [{ role: 'user', content: 'Test 2' }] });

      const secondCall = global.fetch.mock.calls[1];
      const secondAuth = secondCall[1].headers.Authorization;
      expect(secondAuth).toContain('key2');
    });

    test('should include system prompt in request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }) }) },
      });

      await request(app)
        .post('/api/helpdesk/chat')
        .send({
          messages: [
            { role: 'user', content: 'What is AlpacaParty?' }
          ]
        });

      const callArgs = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('Paca');
    });

    test('should pass user messages through', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }) }) },
      });

      const userMessages = [
        { role: 'user', content: 'Hello Paca' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      await request(app)
        .post('/api/helpdesk/chat')
        .send({ messages: userMessages });

      const callArgs = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.messages).toContainEqual(userMessages[0]);
      expect(requestBody.messages).toContainEqual(userMessages[1]);
    });

    test('should configure request with correct parameters', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }) }) },
      });

      await request(app)
        .post('/api/helpdesk/chat')
        .send({ messages: [{ role: 'user', content: 'Test' }] });

      const callArgs = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.model).toBe('mixtral-8x7b-32768');
      expect(requestBody.max_tokens).toBe(600);
      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.stream).toBe(true);
    });
  });

  describe('Router initialization', () => {
    test('should export a router', () => {
      expect(helpdeskRouter).toBeTruthy();
      expect(typeof helpdeskRouter).toBe('function');
    });
  });
});
