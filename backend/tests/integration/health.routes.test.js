/**
 * Health & Root Endpoint Integration Tests
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

const { createTestApp } = await import('../helpers/createApp.js');

let app;
let request;

beforeEach(async () => {
  mockQuery.mockReset();
  app = await createTestApp();
  request = supertest(app);
});

describe('GET /api/health', () => {
  test('200 — returns health status', async () => {
    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toMatch(/running/i);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBe('0.0.1');
  });
});

describe('Not Found', () => {
  test('404 — unknown route', async () => {
    const res = await request.get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Not Found');
  });
});
