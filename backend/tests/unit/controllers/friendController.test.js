/**
 * Friend Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockFriend = {
  getFriends: jest.fn(),
  getOnlineFriends: jest.fn(),
  getPendingReceived: jest.fn(),
  getPendingSent: jest.fn(),
  sendRequest: jest.fn(),
  acceptRequest: jest.fn(),
  declineRequest: jest.fn(),
  removeFriend: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  getBlocked: jest.fn(),
};
const mockUser = {
  findById: jest.fn(),
};
const mockNotificationService = {
  friendRequest: jest.fn().mockResolvedValue(undefined),
  friendAccepted: jest.fn().mockResolvedValue(undefined),
};
const mockGamificationService = {
  checkSocialAchievements: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('../../../src/models/Friend.js', () => ({ default: mockFriend }));
jest.unstable_mockModule('../../../src/models/User.js', () => ({ default: mockUser }));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({ default: mockNotificationService }));
jest.unstable_mockModule('../../../src/services/gamificationService.js', () => ({ default: mockGamificationService }));

const {
  listFriends, listOnlineFriends, listRequests, sendRequest,
  acceptRequest, declineRequest, removeFriend, blockUser, unblockUser, listBlocked,
} = await import('../../../src/controllers/friendController.js');

function createReqRes(overrides = {}) {
  const req = { user: { id: 1, username: 'tester', isAdmin: false }, params: {}, query: {}, body: {}, ...overrides };
  const res = {
    _status: 200, _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => jest.clearAllMocks());

// ── listFriends ──────────────────────────────────────────────────────────────
describe('listFriends', () => {
  test('returns friends with default pagination', async () => {
    const friends = [{ id: 2, username: 'bob' }];
    mockFriend.getFriends.mockResolvedValue(friends);
    const { req, res, next } = createReqRes();
    await listFriends(req, res, next);
    expect(mockFriend.getFriends).toHaveBeenCalledWith(1, { limit: 50, offset: 0 });
    expect(res._json.friends).toEqual(friends);
  });

  test('passes custom pagination', async () => {
    mockFriend.getFriends.mockResolvedValue([]);
    const { req, res, next } = createReqRes({ query: { limit: '10', offset: '5' } });
    await listFriends(req, res, next);
    expect(mockFriend.getFriends).toHaveBeenCalledWith(1, { limit: 10, offset: 5 });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.getFriends.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listFriends(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── listOnlineFriends ────────────────────────────────────────────────────────
describe('listOnlineFriends', () => {
  test('returns online friends', async () => {
    const friends = [{ id: 2, username: 'bob', is_online: true }];
    mockFriend.getOnlineFriends.mockResolvedValue(friends);
    const { req, res, next } = createReqRes();
    await listOnlineFriends(req, res, next);
    expect(mockFriend.getOnlineFriends).toHaveBeenCalledWith(1);
    expect(res._json.friends).toEqual(friends);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.getOnlineFriends.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listOnlineFriends(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── listRequests ─────────────────────────────────────────────────────────────
describe('listRequests', () => {
  test('returns received and sent requests', async () => {
    const received = [{ id: 1, senderId: 2 }];
    const sent = [{ id: 2, receiverId: 3 }];
    mockFriend.getPendingReceived.mockResolvedValue(received);
    mockFriend.getPendingSent.mockResolvedValue(sent);
    const { req, res, next } = createReqRes();
    await listRequests(req, res, next);
    expect(res._json.received).toEqual(received);
    expect(res._json.sent).toEqual(sent);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.getPendingReceived.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listRequests(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── sendRequest ──────────────────────────────────────────────────────────────
describe('sendRequest', () => {
  test('sends friend request successfully', async () => {
    mockUser.findById.mockResolvedValue({ id: 2, username: 'bob' });
    mockFriend.sendRequest.mockResolvedValue({ id: 1, senderId: 1, receiverId: 2, status: 'pending' });
    const { req, res, next } = createReqRes({ body: { userId: 2 } });
    await sendRequest(req, res, next);
    expect(res._status).toBe(201);
    expect(mockFriend.sendRequest).toHaveBeenCalledWith(1, 2);
    expect(mockNotificationService.friendRequest).toHaveBeenCalledWith(2, 'tester');
  });

  test('returns 400 when userId is missing', async () => {
    const { req, res, next } = createReqRes({ body: {} });
    await sendRequest(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('userId is required');
  });

  test('returns 400 when trying to friend yourself', async () => {
    const { req, res, next } = createReqRes({ body: { userId: 1 } });
    await sendRequest(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Cannot friend yourself');
  });

  test('returns 404 when target user not found', async () => {
    mockUser.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ body: { userId: 999 } });
    await sendRequest(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('User not found');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockUser.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ body: { userId: 2 } });
    await sendRequest(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── acceptRequest ────────────────────────────────────────────────────────────
describe('acceptRequest', () => {
  test('accepts request successfully', async () => {
    const request = { id: 1, senderId: 2, receiverId: 1, status: 'accepted' };
    mockFriend.acceptRequest.mockResolvedValue(request);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await acceptRequest(req, res, next);
    expect(mockFriend.acceptRequest).toHaveBeenCalledWith(1, 1);
    expect(mockNotificationService.friendAccepted).toHaveBeenCalledWith(2, 'tester');
    expect(mockGamificationService.checkSocialAchievements).toHaveBeenCalledWith(1);
    expect(res._json.request).toEqual(request);
  });

  test('returns 404 when request not found', async () => {
    mockFriend.acceptRequest.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await acceptRequest(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('Request not found');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.acceptRequest.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await acceptRequest(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── declineRequest ───────────────────────────────────────────────────────────
describe('declineRequest', () => {
  test('declines request successfully', async () => {
    const request = { id: 1, status: 'declined' };
    mockFriend.declineRequest.mockResolvedValue(request);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await declineRequest(req, res, next);
    expect(mockFriend.declineRequest).toHaveBeenCalledWith(1, 1);
    expect(res._json.request).toEqual(request);
  });

  test('returns 404 when request not found', async () => {
    mockFriend.declineRequest.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await declineRequest(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('Request not found');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.declineRequest.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await declineRequest(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── removeFriend ─────────────────────────────────────────────────────────────
describe('removeFriend', () => {
  test('removes friend successfully', async () => {
    mockFriend.removeFriend.mockResolvedValue(undefined);
    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await removeFriend(req, res, next);
    expect(mockFriend.removeFriend).toHaveBeenCalledWith(1, 2);
    expect(res._json.message).toBe('Friend removed');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.removeFriend.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await removeFriend(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── blockUser ────────────────────────────────────────────────────────────────
describe('blockUser', () => {
  test('blocks user successfully', async () => {
    mockFriend.blockUser.mockResolvedValue({});
    const { req, res, next } = createReqRes({ body: { userId: 2 } });
    await blockUser(req, res, next);
    expect(mockFriend.blockUser).toHaveBeenCalledWith(1, 2);
    expect(res._json.message).toBe('User blocked');
  });

  test('returns 400 when userId is missing', async () => {
    const { req, res, next } = createReqRes({ body: {} });
    await blockUser(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('userId is required');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.blockUser.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ body: { userId: 2 } });
    await blockUser(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── unblockUser ──────────────────────────────────────────────────────────────
describe('unblockUser', () => {
  test('unblocks user successfully', async () => {
    mockFriend.unblockUser.mockResolvedValue(undefined);
    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await unblockUser(req, res, next);
    expect(mockFriend.unblockUser).toHaveBeenCalledWith(1, 2);
    expect(res._json.message).toBe('User unblocked');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.unblockUser.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await unblockUser(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── listBlocked ──────────────────────────────────────────────────────────────
describe('listBlocked', () => {
  test('returns blocked users', async () => {
    const blocked = [{ id: 3, username: 'troll' }];
    mockFriend.getBlocked.mockResolvedValue(blocked);
    const { req, res, next } = createReqRes();
    await listBlocked(req, res, next);
    expect(mockFriend.getBlocked).toHaveBeenCalledWith(1);
    expect(res._json.blocked).toEqual(blocked);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockFriend.getBlocked.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listBlocked(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
