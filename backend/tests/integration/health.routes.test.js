/**
 * Health & Root Endpoint Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertestC from 'supertest';


// Health tests should not depend on generated Prisma runtime artifacts.
jest.unstable_mockModule('#config/prisma.js', () => ({
  default: {
    $disconnect: jest.fn(),
  },
  prisma: {
    $disconnect: jest.fn(),
  },
}));

const { createTestApp } = await import('../helpers/createApp.js');

let app;
let request;

beforeEach(async () => {
  app = await createTestApp();
  request = supertestC(app);
});

describe('GET /api/health', () => {
  test('200 — returns health status', async () => {
    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toMatch(/running/i);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBe('0.1.0');
  });
});

describe('Not Found', () => {
  test('404 — unknown route', async () => {
    const res = await request.get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Not Found');
  });
});
