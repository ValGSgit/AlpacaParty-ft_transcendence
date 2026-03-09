/**
 * Organizations Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

const mockQuery = jest.fn();
const mockClient = { query: jest.fn(), release: jest.fn() };
jest.unstable_mockModule('../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn().mockResolvedValue(mockClient),
  default: { on: jest.fn(), query: mockQuery },
}));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'orguser', email: 'o@test.com', is_admin: false };
const sampleOrg = {
  id: 5,
  name: 'AlpacaClub',
  description: 'A club for alpacas',
  owner_id: 1,
  member_count: 1,
};

beforeEach(async () => {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockClient.query.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'orguser', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/organizations ────────────────────────────────────
describe('GET /api/organizations', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/organizations');
    expect(res.status).toBe(401);
  });

  test('200 — returns organizations list', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleOrg] });
    const res = await request.get('/api/organizations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(1);
  });

  test('200 — filters by search query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request
      .get('/api/organizations?q=alpaca')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(0);
  });
});

// ── GET /api/organizations/mine ───────────────────────────────
describe('GET /api/organizations/mine', () => {
  test('200 — returns user orgs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleOrg] });
    const res = await request
      .get('/api/organizations/mine')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(1);
  });
});

// ── GET /api/organizations/:id ────────────────────────────────
describe('GET /api/organizations/:id', () => {
  test('404 — not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Organization.findById → empty
    const res = await request
      .get('/api/organizations/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 — returns organization', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleOrg] });
    const res = await request.get('/api/organizations/5').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe('AlpacaClub');
  });
});

// ── POST /api/organizations ───────────────────────────────────
describe('POST /api/organizations', () => {
  test('400 — missing name', async () => {
    const res = await auth(request.post('/api/organizations')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/name/i);
  });

  test('201 — creates organization', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    // Organization.create uses getClient transaction: BEGIN, INSERT org, INSERT member, COMMIT
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [sampleOrg] }); // INSERT org → rows[0] used
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT member
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
    // GamificationService.checkOrgAchievements → Achievement.unlock → default { rows: [] } → fine
    const res = await request
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AlpacaClub', description: 'A club for alpacas' });
    expect(res.status).toBe(201);
    expect(res.body.organization.name).toBe('AlpacaClub');
  });
});

// ── PUT /api/organizations/:id ────────────────────────────────
describe('PUT /api/organizations/:id', () => {
  test('403 — non-member cannot update', async () => {
    // updateOrg checks isMember FIRST (no findById), so empty membership → 403
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [] }); // isMember → null → 403
    const res = await request
      .put('/api/organizations/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(403);
  });

  test('403 — not owner or admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // isMember → member role → 403
    const res = await request
      .put('/api/organizations/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(403);
  });

  test('200 — owner can update', async () => {
    const updated = { ...sampleOrg, name: 'Updated Club' };
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'owner' }] }); // isMember → owner → passes
    mockQuery.mockResolvedValueOnce({ rows: [updated] }); // Organization.update
    const res = await request
      .put('/api/organizations/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Club' });
    expect(res.status).toBe(200);
  });
});

// ── DELETE /api/organizations/:id ────────────────────────────
describe('DELETE /api/organizations/:id', () => {
  test('404 — not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findById → empty
    const res = await request
      .delete('/api/organizations/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('403 — not the owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...sampleOrg, owner_id: 99 }] }); // findById
    const res = await request
      .delete('/api/organizations/5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('200 — owner can delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleOrg] }); // findById — owner_id: 1
    mockQuery.mockResolvedValueOnce({ rows: [] }); // delete
    const res = await request
      .delete('/api/organizations/5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── POST /api/organizations/:id/members ──────────────────────
describe('POST /api/organizations/:id/members', () => {
  test('400 — missing userId', async () => {
    const res = await auth(request.post('/api/organizations/5/members')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/userId/i);
  });

  test('403 — non-owner cannot add members', async () => {
    // addMember checks isMember FIRST, not findById
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // isMember → member role → 403
    const res = await request
      .post('/api/organizations/5/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 3 });
    expect(res.status).toBe(403);
  });

  test('201 — owner can add members', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'owner' }] }); // isMember → owner → passes
    mockQuery.mockResolvedValueOnce({ rows: [sampleOrg] }); // Organization.findById
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Organization.addMember
    // NotificationService.orgInvite is fire-and-forget (.catch(() => {})), won't block response
    const res = await request
      .post('/api/organizations/5/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 3 });
    expect(res.status).toBe(201);
  });
});
