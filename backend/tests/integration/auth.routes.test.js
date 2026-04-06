import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  userAuth: {
    update: jest.fn(),
  },
  achievement: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userAchievement: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
});

describe('POST /api/auth/register', () => {
  test('400 for missing username', async () => {
    const res = await request.post('/api/auth/register').send({ email: 'a@b.com', password: 'ValidPass1' });
    expect(res.status).toBe(400);
  });

  test('409 when username already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, username: 'taken' });
    const res = await request
      .post('/api/auth/register')
      .send({ username: 'taken', email: 'new@example.com', password: 'ValidPass1' });

    expect(res.status).toBe(409);
  });

  test('201 on successful registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 1,
      username: 'newuser',
      email: 'new@example.com',
      avatar: '/avatars/default.svg',
      status: 'online',
      isOnline: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAuth: { oauthProvider: null },
      userStats: { xp: 0, level: 1 },
      userSettings: { isPublic: true, isAdmin: false },
      alpacaFarm: { coins: 0, alpacas: [], items: [], upgrades: 0 },
    });
    mockPrisma.achievement.findUnique.mockResolvedValueOnce(null);

    const res = await request
      .post('/api/auth/register')
      .send({ username: 'newuser', email: 'new@example.com', password: 'ValidPass1' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  test('400 for missing password', async () => {
    const res = await request.post('/api/auth/login').send({ username: 'user' });
    expect(res.status).toBe(400);
  });

  test('401 for unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request.post('/api/auth/login').send({ username: 'ghost', password: 'ValidPass1' });
    expect(res.status).toBe(401);
  });

  test('200 for valid credentials', async () => {
    const hash = await AuthService.hashPassword('ValidPass1');
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      username: 'tester',
      email: 'test@test.com',
      passwordHash: hash,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      username: 'tester',
      email: 'test@test.com',
      avatar: '/avatars/default.svg',
      status: 'online',
      isOnline: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAuth: { oauthProvider: null },
      userStats: { xp: 0, level: 1 },
      userSettings: { isPublic: true, isAdmin: false },
      alpacaFarm: { coins: 0, alpacas: [], items: [], upgrades: 0 },
    });

    const res = await request.post('/api/auth/login').send({ username: 'tester', password: 'ValidPass1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

describe('POST /api/auth/refresh', () => {
  test('401 for invalid refresh token', async () => {
    const res = await request.post('/api/auth/refresh').send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });

  test('200 for valid refresh token', async () => {
    const refreshToken = AuthService.generateRefreshToken({ id: 1 });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, username: 'tester' });

    const res = await request.post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  test('401 without token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('200 with valid token', async () => {
    const token = AuthService.generateAccessToken({ id: 1, username: 'tester', isAdmin: false });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      username: 'tester',
      email: 'test@test.com',
      avatar: '/avatars/default.svg',
      status: 'online',
      isOnline: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAuth: { oauthProvider: null },
      userStats: { xp: 0, level: 1 },
      userSettings: { isPublic: true, isAdmin: false },
      alpacaFarm: { coins: 0, alpacas: [], items: [], upgrades: 0 },
    });

    const res = await request.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('tester');
  });
});
