/**
 * Chat Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import supertest from 'supertest';

// ── Mock prisma ──
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), upsert: jest.fn() },
  message: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
  chatRoom: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  chatRoomMember: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  chatRoomMessage: { findMany: jest.fn(), create: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
  notification: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { createTestApp } = await import('../helpers/createApp.js');
const { default: AuthService } = await import('../../src/services/authService.js');

let app;
let request;
let token;

const authUser = { id: 1, username: 'chatuser', email: 'c@test.com', isAdmin: false, isPublic: true };
const sampleMsgPrisma = {
  id: 1, senderId: 1, receiverId: 2, content: 'Hi', isRead: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  sender: { username: 'chatuser', avatar: null },
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === 'function' ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({ id: 1, username: 'chatuser', isAdmin: false });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set('Authorization', `Bearer ${token}`);
}

// ── GET /api/chat/conversations ───────────────────────────────
describe('GET /api/chat/conversations', () => {
  test('401 — requires auth', async () => {
    const res = await request.get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  test('200 — returns conversations', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Message.getConversationsList → $queryRaw
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      { other_user_id: 2, username: 'friend', last_message: 'Hey', is_read: true, unread_count: 0 },
    ]);
    const res = await request.get('/api/chat/conversations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('conversations');
  });
});

// ── GET /api/chat/dm/:userId ──────────────────────────────────
describe('GET /api/chat/dm/:userId', () => {
  test('200 — returns conversation messages', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    // Message.getConversation → message.findMany
    mockPrisma.message.findMany.mockResolvedValueOnce([sampleMsgPrisma]);
    // Message.markAsRead → message.updateMany
    mockPrisma.message.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await request.get('/api/chat/dm/2').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});

// ── GET /api/chat/unread ──────────────────────────────────────
describe('GET /api/chat/unread', () => {
  test('200 — returns unread count', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Message.countUnread → message.count → returns number
    mockPrisma.message.count.mockResolvedValueOnce(3);
    const res = await request.get('/api/chat/unread').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });
});

// ── GET /api/chat/rooms ───────────────────────────────────────
describe('GET /api/chat/rooms', () => {
  test('200 — returns user rooms', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // ChatRoom.getUserRooms → chatRoomMember.findMany(include: { room: true })
    mockPrisma.chatRoomMember.findMany.mockResolvedValueOnce([
      { room: { id: 10, name: 'General', ownerId: 1, isPrivate: false, createdAt: '2026-01-01' }, role: 'owner' },
    ]);
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    // ChatRoom.create → $transaction(async tx => { chatRoom.create, chatRoomMember.create })
    mockPrisma.chatRoom.create.mockResolvedValueOnce({
      id: 10, name: 'General', ownerId: 1, isPrivate: false, createdAt: '2026-01-01',
    });
    mockPrisma.chatRoomMember.create.mockResolvedValueOnce({});

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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // ChatRoom.isMember → chatRoomMember.findUnique → null → !!null = false
    mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .get('/api/chat/rooms/10/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('200 — returns room messages for member', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // ChatRoom.isMember → chatRoomMember.findUnique → row (truthy)
    mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce({ roomId: 10, userId: 1 });
    // ChatRoom.getMessages → chatRoomMessage.findMany
    mockPrisma.chatRoomMessage.findMany.mockResolvedValueOnce([
      { id: 1, roomId: 10, senderId: 1, content: 'Hello', createdAt: '2026-01-01', sender: { username: 'chatuser', avatar: null } },
    ]);
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // ChatRoom.findById → chatRoom.findUnique → null
    mockPrisma.chatRoom.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .post('/api/chat/rooms/999/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 2 });
    expect(res.status).toBe(404);
  });

  test('201 — adds member', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({ id: 10, name: 'General', ownerId: 1, isPrivate: false });
    // ChatRoom.addMember → chatRoomMember.upsert
    mockPrisma.chatRoomMember.upsert.mockResolvedValueOnce({ roomId: 10, userId: 2, role: 'member' });
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
    // ChatRoom.removeMember → chatRoomMember.deleteMany
    const res = await auth(request.delete('/api/chat/rooms/10/members/2'));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });
});

// ── DELETE /api/chat/rooms/:id ────────────────────────────────
describe('DELETE /api/chat/rooms/:id', () => {
  test('404 — room not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.chatRoom.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .delete('/api/chat/rooms/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('403 — not the owner', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // room.ownerId (99) !== req.user.id (1) → 403
    mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({ id: 10, name: 'General', ownerId: 99, isPrivate: false });
    const res = await request
      .delete('/api/chat/rooms/10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('200 — deletes room', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({ id: 10, name: 'General', ownerId: 1, isPrivate: false });
    // ChatRoom.delete → chatRoom.delete
    mockPrisma.chatRoom.delete.mockResolvedValueOnce({});
    const res = await request
      .delete('/api/chat/rooms/10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
