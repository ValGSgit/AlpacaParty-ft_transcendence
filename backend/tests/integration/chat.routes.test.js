/**
 * Chat Routes Integration Tests
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

const authUser = { id: 1, username: 'chatuser', email: 'c@test.com', is_admin: false };
const sampleRoom = { id: 10, name: 'General', owner_id: 1, is_private: false };
const sampleMsg = { id: 1, sender_id: 1, receiver_id: 2, content: 'Hi', created_at: new Date().toISOString() };

beforeEach(async () => {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockClient.query.mockResolvedValue({ rows: [] });
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'chatuser', is_admin: false });
});

function auth(req) {
  mockQuery.mockResolvedValueOnce({ rows: [authUser] });
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/chat/conversations ───────────────────────────────
describe('GET /api/chat/conversations', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  test('200 — returns conversations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ partner_id: 2, username: 'friend', unread: 0 }] });
    const res = await request.get('/api/chat/conversations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('conversations');
  });
});

// ── GET /api/chat/dm/:userId ──────────────────────────────────
describe('GET /api/chat/dm/:userId', () => {
  test('200 — returns conversation messages', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [sampleMsg] }); // getConversation
    mockQuery.mockResolvedValueOnce({ rows: [] }); // markAsRead
    const res = await request.get('/api/chat/dm/2').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});

// ── GET /api/chat/unread ──────────────────────────────────────
describe('GET /api/chat/unread', () => {
  test('200 — returns unread count', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] }); // countUnread uses rows[0].total
    const res = await request.get('/api/chat/unread').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });
});

// ── GET /api/chat/rooms ───────────────────────────────────────
describe('GET /api/chat/rooms', () => {
  test('200 — returns user rooms', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleRoom] });
    const res = await request.get('/api/chat/rooms').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rooms).toHaveLength(1);
  });
});

// ── POST /api/chat/rooms ──────────────────────────────────────
describe('POST /api/chat/rooms', () => {
  test('400 — missing room name', async () => {
    const res = await auth(request.post('/api/chat/rooms')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/name/i);
  });

  test('400 — empty room name', async () => {
    const res = await auth(request.post('/api/chat/rooms')).send({ name: '  ' });
    expect(res.status).toBe(400);
  });

  test('201 — creates room', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] }); // auth
    // ChatRoom.create uses getClient transaction: BEGIN, INSERT room, INSERT member, COMMIT
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [sampleRoom] }); // INSERT room → rows[0] used as room
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT member
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
    const res = await request
      .post('/api/chat/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'General' });
    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('General');
  });
});

// ── GET /api/chat/rooms/:id/messages ─────────────────────────
describe('GET /api/chat/rooms/:id/messages', () => {
  test('403 — not a member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // isMember → false
    const res = await request
      .get('/api/chat/rooms/10/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('200 — returns room messages for member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1, room_id: 10 }] }); // isMember
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, room_id: 10, content: 'Hello' }] }); // getMessages
    const res = await request
      .get('/api/chat/rooms/10/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});

// ── POST /api/chat/rooms/:id/members ─────────────────────────
describe('POST /api/chat/rooms/:id/members', () => {
  test('400 — missing userId', async () => {
    const res = await auth(request.post('/api/chat/rooms/10/members')).send({});
    expect(res.status).toBe(400);
  });

  test('404 — room not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findById → not found
    const res = await request
      .post('/api/chat/rooms/999/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 2 });
    expect(res.status).toBe(404);
  });

  test('201 — adds member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleRoom] }); // findById
    mockQuery.mockResolvedValueOnce({ rows: [{ room_id: 10, user_id: 2 }] }); // addMember
    const res = await request
      .post('/api/chat/rooms/10/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 2 });
    expect(res.status).toBe(201);
  });
});

// ── DELETE /api/chat/rooms/:id/members/:userId ────────────────
describe('DELETE /api/chat/rooms/:id/members/:userId', () => {
  test('200 — removes member', async () => {
    const res = await auth(request.delete('/api/chat/rooms/10/members/2'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });
});

// ── DELETE /api/chat/rooms/:id ────────────────────────────────
describe('DELETE /api/chat/rooms/:id', () => {
  test('404 — room not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // findById → not found
    const res = await request
      .delete('/api/chat/rooms/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('403 — not the owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...sampleRoom, owner_id: 99 }] }); // findById — different owner
    const res = await request
      .delete('/api/chat/rooms/10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('200 — deletes room', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleRoom] }); // findById — owner_id: 1
    mockQuery.mockResolvedValueOnce({ rows: [] }); // delete
    const res = await request
      .delete('/api/chat/rooms/10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
