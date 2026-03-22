/**
 * Chat Controller Unit Tests — validates NaN prevention and self-message blocking
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockMessage = {
  getConversation: jest.fn(),
  markAsRead: jest.fn(),
  getConversationsList: jest.fn(),
  countUnread: jest.fn(),
};
const mockChatRoom = {
  getUserRooms: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  isMember: jest.fn(),
  getMessages: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  delete: jest.fn(),
  sendMessage: jest.fn(),
};

jest.unstable_mockModule('../../../src/models/Message.js', () => ({ default: mockMessage }));
jest.unstable_mockModule('../../../src/models/ChatRoom.js', () => ({ default: mockChatRoom }));

const { getConversation } = await import('../../../src/controllers/chatController.js');

function mockReq(params = {}, body = {}, user = { id: 1, is_admin: false }, query = {}) {
  return { params, body, user, query };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe('getConversation — input validation', () => {
  test('400 — returns error when userId is NaN', async () => {
    const req = mockReq({ userId: 'abc' });
    const res = mockRes();
    await getConversation(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: expect.stringMatching(/invalid/i) }) })
    );
    expect(mockMessage.getConversation).not.toHaveBeenCalled();
  });

  test('400 — prevents self-messaging via REST endpoint', async () => {
    const req = mockReq({ userId: '1' }, {}, { id: 1 }); // user.id === userId
    const res = mockRes();
    await getConversation(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: expect.stringMatching(/yourself/i) }) })
    );
    expect(mockMessage.getConversation).not.toHaveBeenCalled();
  });

  test('200 — returns messages for valid userId', async () => {
    mockMessage.getConversation.mockResolvedValue([
      { id: 1, sender_id: 1, receiver_id: 2, content: 'Hello', created_at: new Date() }
    ]);
    mockMessage.markAsRead.mockResolvedValue();
    const req = mockReq({ userId: '2' }, {}, { id: 1 });
    const res = mockRes();
    await getConversation(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.any(Array) }));
    expect(mockMessage.getConversation).toHaveBeenCalledWith(1, 2, { limit: 50, offset: 0 });
  });
});
