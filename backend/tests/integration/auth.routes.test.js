/**
 * Auth Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock database before importing anything that depends on it ──
const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;

beforeEach(async () => {
  mockQuery.mockReset();
  app = await createTestApp();
  request = supertest(app);
});

// ────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validBody = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'ValidPass1',
  };

  test('201 — successful registration', async () => {
    // findByUsername → null, findByEmail → null
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // User.create → new user row
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'newuser', email: 'new@example.com', avatar: '/avatars/default.svg', is_admin: false, created_at: new Date().toISOString() }],
    });

    const res = await request.post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('newuser');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('400 — missing username', async () => {
    const res = await request.post('/api/auth/register').send({ email: 'a@b.com', password: 'ValidPass1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/required/i);
  });

  test('400 — missing email', async () => {
    const res = await request.post('/api/auth/register').send({ username: 'user', password: 'ValidPass1' });
    expect(res.status).toBe(400);
  });

  test('400 — missing password', async () => {
    const res = await request.post('/api/auth/register').send({ username: 'user', email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('400 — username too short', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, username: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/3-32/);
  });

  test('400 — username too long', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, username: 'a'.repeat(33) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/3-32/);
  });

  test('400 — username with invalid characters', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, username: 'user name!' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/letters, numbers/i);
  });

  test('400 — password too weak (no uppercase)', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, password: 'weakpass1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/uppercase/i);
  });

  test('400 — password too short', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, password: 'Ab1' });
    expect(res.status).toBe(400);
  });

  test('409 — username already taken', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newuser' }] }); // findByUsername returns existing
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByEmail

    const res = await request.post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/username/i);
  });

  test('409 — email already registered', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByUsername
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, email: 'new@example.com' }] }); // findByEmail returns existing

    const res = await request.post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/email/i);
  });
});

// ────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('200 — successful login by username', async () => {
    const hash = await AuthService.hashPassword('ValidPass1');
    const dbUser = { id: 1, username: 'tester', email: 'test@test.com', password_hash: hash, is_admin: false };

    mockQuery.mockResolvedValueOnce({ rows: [dbUser] }); // findByUsername
    mockQuery.mockResolvedValueOnce({ rows: [] }); // setOnline

    const res = await request.post('/api/auth/login').send({ username: 'tester', password: 'ValidPass1' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.username).toBe('tester');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('200 — successful login by email', async () => {
    const hash = await AuthService.hashPassword('ValidPass1');
    const dbUser = { id: 1, username: 'tester', email: 'test@test.com', password_hash: hash, is_admin: false };

    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByUsername → not found
    mockQuery.mockResolvedValueOnce({ rows: [dbUser] }); // findByEmail → found
    mockQuery.mockResolvedValueOnce({ rows: [] }); // setOnline

    const res = await request.post('/api/auth/login').send({ username: 'test@test.com', password: 'ValidPass1' });
    expect(res.status).toBe(200);
  });

  test('400 — missing fields', async () => {
    const res = await request.post('/api/auth/login').send({ username: 'user' });
    expect(res.status).toBe(400);
  });

  test('401 — user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByUsername
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findByEmail

    const res = await request.post('/api/auth/login').send({ username: 'ghost', password: 'ValidPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid/i);
  });

  test('401 — wrong password', async () => {
    const hash = await AuthService.hashPassword('CorrectPass1');
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'user', password_hash: hash }] });

    const res = await request.post('/api/auth/login').send({ username: 'user', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('200 — successful logout', async () => {
    const fakeUser = { id: 1, username: 'tester' };
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', is_admin: false });

    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] }); // authenticate → findById
    mockQuery.mockResolvedValueOnce({ rows: [] }); // setOnline(false)

    const res = await request
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });

  test('401 — without token', async () => {
    const res = await request.post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  test('200 — valid refresh token', async () => {
    const refreshToken = AuthService.generateRefreshToken({ id: 1 });
    const fakeUser = { id: 1, username: 'tester', is_admin: false };

    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] }); // findById

    const res = await request.post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('400 — missing refreshToken', async () => {
    const res = await request.post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  test('401 — invalid refresh token', async () => {
    const res = await request.post('/api/auth/refresh').send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });

  test('401 — access token used as refresh', async () => {
    const accessToken = AuthService.generateAccessToken({ id: 1, username: 'u', is_admin: false });
    const res = await request.post('/api/auth/refresh').send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
  });

  test('401 — user not found after decoding', async () => {
    const refreshToken = AuthService.generateRefreshToken({ id: 999 });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request.post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('200 — returns authenticated user', async () => {
    const fakeUser = { id: 1, username: 'tester', email: 'test@test.com' };
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', is_admin: false });

    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] }); // authenticate

    const res = await request.get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('tester');
  });

  test('401 — without token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
