/**
 * Message Model Unit Tests — verifies snake_case field mapping
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockMsg = {
  id: 1,
  senderId: 1,
  receiverId: 2,
  content: 'Hey!',
  isRead: false,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  sender: { username: 'alice', avatar: '/avatars/alice.jpg' },
};

const mockPrisma = {
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  blockedUser: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('#config/prisma.js', () => ({
  default: mockPrisma,
}));

const { default: Message } = await import('../../../src/models/Message.js');

beforeEach(() => jest.clearAllMocks());

describe('Message.getConversation — snake_case output', () => {
  test('returns snake_case fields', async () => {
    mockPrisma.message.findMany.mockResolvedValue([mockMsg]);
    const results = await Message.getConversation(1, 2);
    expect(results).toHaveLength(1);
    const m = results[0];
    expect(m).toHaveProperty('sender_id', 1);
    expect(m).toHaveProperty('receiver_id', 2);
    expect(m).toHaveProperty('is_read', false);
    expect(m).toHaveProperty('created_at');
    expect(m).toHaveProperty('sender_username', 'alice');
    expect(m).toHaveProperty('sender_avatar', '/avatars/alice.jpg');
    // No camelCase leakage
    expect(m).not.toHaveProperty('senderId');
    expect(m).not.toHaveProperty('receiverId');
    expect(m).not.toHaveProperty('isRead');
    expect(m).not.toHaveProperty('createdAt');
  });
});

describe('Message.getConversationsList — Prisma-only', () => {
  const baseDate = new Date('2024-01-01T10:00:00Z');
  const olderDate = new Date('2024-01-01T09:00:00Z');

  test('dedupes by other-user, takes newest message, fills unread count', async () => {
    mockPrisma.blockedUser.findMany.mockResolvedValue([]);
    // Newest first, with duplicates for user 2 to verify dedupe.
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 3,
        senderId: 2,
        receiverId: 1,
        content: 'latest from bob',
        isRead: false,
        createdAt: baseDate,
        sender: { id: 2, username: 'bob', avatar: '/avatars/bob.jpg' },
        receiver: { id: 1, username: 'me', avatar: null },
      },
      {
        id: 2,
        senderId: 1,
        receiverId: 2,
        content: 'older outbound',
        isRead: true,
        createdAt: olderDate,
        sender: { id: 1, username: 'me', avatar: null },
        receiver: { id: 2, username: 'bob', avatar: '/avatars/bob.jpg' },
      },
      {
        id: 1,
        senderId: 3,
        receiverId: 1,
        content: 'hi from carol',
        isRead: false,
        createdAt: olderDate,
        sender: { id: 3, username: 'carol', avatar: null },
        receiver: { id: 1, username: 'me', avatar: null },
      },
    ]);
    mockPrisma.message.groupBy.mockResolvedValue([
      { senderId: 2, _count: { _all: 4 } },
      { senderId: 3, _count: { _all: 1 } },
    ]);

    const result = await Message.getConversationsList(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      other_user_id: 2,
      username: 'bob',
      avatar: '/avatars/bob.jpg',
      last_message: 'latest from bob',
      is_read: false,
      unread_count: 4,
    });
    expect(result[1]).toMatchObject({
      other_user_id: 3,
      username: 'carol',
      last_message: 'hi from carol',
      unread_count: 1,
    });
  });

  test('skips conversations with blocked users (either direction)', async () => {
    mockPrisma.blockedUser.findMany.mockResolvedValue([
      { userId: 1, blockedUserId: 2 },
      { userId: 3, blockedUserId: 1 },
    ]);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 1,
        senderId: 2,
        receiverId: 1,
        content: 'should be hidden',
        isRead: false,
        createdAt: baseDate,
        sender: { id: 2, username: 'bob', avatar: null },
        receiver: { id: 1, username: 'me', avatar: null },
      },
      {
        id: 2,
        senderId: 3,
        receiverId: 1,
        content: 'also hidden',
        isRead: false,
        createdAt: baseDate,
        sender: { id: 3, username: 'carol', avatar: null },
        receiver: { id: 1, username: 'me', avatar: null },
      },
    ]);
    mockPrisma.message.groupBy.mockResolvedValue([]);

    const result = await Message.getConversationsList(1);
    expect(result).toEqual([]);
    expect(mockPrisma.message.groupBy).not.toHaveBeenCalled();
  });

  test('returns empty list when no messages exist', async () => {
    mockPrisma.blockedUser.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);

    const result = await Message.getConversationsList(1);
    expect(result).toEqual([]);
    expect(mockPrisma.message.groupBy).not.toHaveBeenCalled();
  });
});

describe('Message.create', () => {
  test('creates message with correct field types', async () => {
    mockPrisma.message.create.mockResolvedValue({ id: 5 });
    await Message.create({ senderId: '1', receiverId: '2', content: 'test' });
    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: { senderId: 1, receiverId: 2, content: 'test' },
    });
  });
});
