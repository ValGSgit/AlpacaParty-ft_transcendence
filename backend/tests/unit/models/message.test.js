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
  },
  $queryRaw: jest.fn(),
};

jest.unstable_mockModule('../../../src/config/prisma.js', () => ({
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

describe('Message.getConversationsList — correct SQL aliases', () => {
  test('calls $queryRaw and returns result', async () => {
    const mockConvs = [{ other_user_id: 2, username: 'bob', avatar: null, last_message: 'Hi', unread_count: 1 }];
    mockPrisma.$queryRaw.mockResolvedValue(mockConvs);
    const result = await Message.getConversationsList(1);
    expect(result).toEqual(mockConvs);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
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
