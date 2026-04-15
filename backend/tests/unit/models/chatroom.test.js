/**
 * ChatRoom Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  chatRoom: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  chatRoomMember: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  chatRoomMessage: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};
jest.unstable_mockModule('#config/prisma.js', () => ({ default: mockPrisma }));

const { default: ChatRoom } = await import('../../../src/models/ChatRoom.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChatRoom.create', () => {
  test('should create room and add owner as member via transaction', async () => {
    const fakeRoom = { id: 1, name: 'General', ownerId: 5, isPrivate: false, createdAt: new Date() };
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        chatRoom: { create: jest.fn().mockResolvedValue(fakeRoom) },
        chatRoomMember: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
    const result = await ChatRoom.create({ name: 'General', ownerId: 5 });
    expect(result).toEqual(expect.objectContaining({
      id: 1,
      name: 'General',
      owner_id: 5,
      is_private: false,
    }));
  });

  test('should pass isPrivate flag', async () => {
    const fakeRoom = { id: 2, name: 'Secret', ownerId: 5, isPrivate: true, createdAt: new Date() };
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        chatRoom: { create: jest.fn().mockResolvedValue(fakeRoom) },
        chatRoomMember: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
    const result = await ChatRoom.create({ name: 'Secret', ownerId: 5, isPrivate: true });
    expect(result.is_private).toBe(true);
  });
});

describe('ChatRoom.findById', () => {
  test('should find room by id', async () => {
    const room = { id: 1, name: 'General' };
    mockPrisma.chatRoom.findUnique.mockResolvedValue(room);
    const result = await ChatRoom.findById(1);
    expect(mockPrisma.chatRoom.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(room);
  });

  test('should return null when not found', async () => {
    mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
    const result = await ChatRoom.findById(999);
    expect(result).toBeNull();
  });
});

describe('ChatRoom.getUserRooms', () => {
  test('should return shaped rooms for a user', async () => {
    mockPrisma.chatRoomMember.findMany.mockResolvedValue([
      {
        role: 'owner',
        room: { id: 1, name: 'General', ownerId: 5, isPrivate: false, createdAt: new Date() },
      },
      {
        role: 'member',
        room: { id: 2, name: 'Random', ownerId: 3, isPrivate: true, createdAt: new Date() },
      },
    ]);
    const result = await ChatRoom.getUserRooms(5);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({ id: 1, role: 'owner' }));
    expect(result[1]).toEqual(expect.objectContaining({ id: 2, role: 'member' }));
  });

  test('should return empty array when user has no rooms', async () => {
    mockPrisma.chatRoomMember.findMany.mockResolvedValue([]);
    const result = await ChatRoom.getUserRooms(999);
    expect(result).toEqual([]);
  });
});

describe('ChatRoom.isMember', () => {
  test('should return true when user is a member', async () => {
    mockPrisma.chatRoomMember.findUnique.mockResolvedValue({ roomId: 1, userId: 5 });
    const result = await ChatRoom.isMember(1, 5);
    expect(result).toBe(true);
  });

  test('should return false when user is not a member', async () => {
    mockPrisma.chatRoomMember.findUnique.mockResolvedValue(null);
    const result = await ChatRoom.isMember(1, 999);
    expect(result).toBe(false);
  });
});

describe('ChatRoom.addMember', () => {
  test('should upsert a member with default role', async () => {
    mockPrisma.chatRoomMember.upsert.mockResolvedValue({ roomId: 1, userId: 10, role: 'member' });
    const result = await ChatRoom.addMember(1, 10);
    expect(mockPrisma.chatRoomMember.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { roomId_userId: { roomId: 1, userId: 10 } },
      create: { roomId: 1, userId: 10, role: 'member' },
    }));
    expect(result.role).toBe('member');
  });

  test('should upsert a member with custom role', async () => {
    mockPrisma.chatRoomMember.upsert.mockResolvedValue({ roomId: 1, userId: 10, role: 'admin' });
    await ChatRoom.addMember(1, 10, 'admin');
    expect(mockPrisma.chatRoomMember.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { roomId: 1, userId: 10, role: 'admin' },
    }));
  });
});

describe('ChatRoom.removeMember', () => {
  test('should delete member record', async () => {
    mockPrisma.chatRoomMember.deleteMany.mockResolvedValue({ count: 1 });
    await ChatRoom.removeMember(1, 10);
    expect(mockPrisma.chatRoomMember.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 1, userId: 10 },
    });
  });
});

describe('ChatRoom.getMessages', () => {
  test('should return shaped messages in chronological order', async () => {
    const now = new Date();
    mockPrisma.chatRoomMessage.findMany.mockResolvedValue([
      { id: 2, roomId: 1, senderId: 5, content: 'Second', createdAt: now, sender: { username: 'bob', avatar: null } },
      { id: 1, roomId: 1, senderId: 3, content: 'First', createdAt: now, sender: { username: 'alice', avatar: 'a.png' } },
    ]);
    const result = await ChatRoom.getMessages(1);
    expect(result).toHaveLength(2);
    // reversed, so First comes first
    expect(result[0].content).toBe('First');
    expect(result[0].sender_username).toBe('alice');
    expect(result[1].content).toBe('Second');
  });

  test('should use default limit and offset', async () => {
    mockPrisma.chatRoomMessage.findMany.mockResolvedValue([]);
    await ChatRoom.getMessages(1);
    expect(mockPrisma.chatRoomMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 50,
      skip: 0,
    }));
  });

  test('should use custom limit and offset', async () => {
    mockPrisma.chatRoomMessage.findMany.mockResolvedValue([]);
    await ChatRoom.getMessages(1, { limit: 10, offset: 5 });
    expect(mockPrisma.chatRoomMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
      skip: 5,
    }));
  });
});

describe('ChatRoom.sendMessage', () => {
  test('should create a chat room message', async () => {
    const msg = { id: 1, roomId: 1, senderId: 5, content: 'Hello' };
    mockPrisma.chatRoomMessage.create.mockResolvedValue(msg);
    const result = await ChatRoom.sendMessage({ roomId: 1, senderId: 5, content: 'Hello' });
    expect(mockPrisma.chatRoomMessage.create).toHaveBeenCalledWith({
      data: { roomId: 1, senderId: 5, content: 'Hello' },
    });
    expect(result).toEqual(msg);
  });
});

describe('ChatRoom.delete', () => {
  test('should delete chat room by id', async () => {
    mockPrisma.chatRoom.delete.mockResolvedValue({});
    await ChatRoom.delete(1);
    expect(mockPrisma.chatRoom.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
