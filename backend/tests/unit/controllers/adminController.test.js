import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = {
  user: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  message: { count: jest.fn() },
  organization: { count: jest.fn() },
};
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({
  default: mockPrisma,
}));

const mockUser = {
  count: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  deleteById: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/User.js', () => ({
  default: mockUser,
  shapeUserForClient: jest.fn((u) => u),
}));

const mockPost = { count: jest.fn() };
jest.unstable_mockModule('../../../src/models/Post.js', () => ({
  default: mockPost,
}));

const mockGame = { countActive: jest.fn() };
jest.unstable_mockModule('../../../src/models/Game.js', () => ({
  default: mockGame,
}));

const mockDataRequest = {
  getPending: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/DataRequest.js', () => ({
  default: mockDataRequest,
}));

const mockDataExportService = { exportUserData: jest.fn() };
jest.unstable_mockModule('../../../src/services/dataExportService.js', () => ({
  default: mockDataExportService,
}));

const mockNotificationService = { dataRequestCompleted: jest.fn() };
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  default: mockNotificationService,
}));

const {
  getStats, listUsers, deleteUser, toggleAdmin,
  listDataRequests, processDataRequest,
} = await import('../../../src/controllers/adminController.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function createReqRes(overrides = {}) {
  const req = { user: { id: 1, isAdmin: true }, params: {}, query: {}, body: {}, ...overrides };
  const res = {
    _status: 200,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getStats ─────────────────────────────────────────────────────────────────
describe('getStats', () => {
  test('should return all site statistics', async () => {
    mockUser.count.mockResolvedValue(100);
    mockPrisma.user.count.mockResolvedValue(12);
    mockGame.countActive.mockResolvedValue(5);
    mockPost.count.mockResolvedValue(300);
    mockPrisma.message.count.mockResolvedValue(800);
    mockPrisma.organization.count.mockResolvedValue(10);
    mockDataRequest.getPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const { req, res, next } = createReqRes();
    await getStats(req, res, next);

    expect(res._json.stats).toEqual({
      totalUsers: 100,
      onlineUsers: 12,
      totalGames: 5,
      totalPosts: 300,
      totalMessages: 800,
      totalOrgs: 10,
      pendingRequests: 2,
    });
    expect(res._json.timestamp).toBeDefined();
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next on error', async () => {
    const error = new Error('db down');
    mockUser.count.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await getStats(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── listUsers ────────────────────────────────────────────────────────────────
describe('listUsers', () => {
  test('should return users array and total', async () => {
    const users = [{ id: 1, username: 'alice' }];
    mockUser.findAll.mockResolvedValue(users);
    mockUser.count.mockResolvedValue(1);

    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);

    expect(mockUser.findAll).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(res._json).toEqual({ users, total: 1 });
  });

  test('should use search when query param provided', async () => {
    const users = [{ id: 2, username: 'bob' }];
    mockUser.search.mockResolvedValue(users);
    mockUser.count.mockResolvedValue(10);

    const { req, res, next } = createReqRes({ query: { search: 'bob', limit: '10', offset: '5' } });
    await listUsers(req, res, next);

    expect(mockUser.search).toHaveBeenCalledWith('bob', { limit: 10, offset: 5 });
    expect(res._json).toEqual({ users, total: 10 });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.findAll.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── deleteUser ───────────────────────────────────────────────────────────────
describe('deleteUser', () => {
  test('should prevent self-deletion', async () => {
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deleteUser(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Cannot delete yourself' } });
    expect(mockUser.deleteById).not.toHaveBeenCalled();
  });

  test('should delete user successfully', async () => {
    mockUser.deleteById.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: '99' } });
    await deleteUser(req, res, next);

    expect(mockUser.deleteById).toHaveBeenCalledWith(99);
    expect(res._json).toEqual({ message: 'User deleted' });
  });

  test('should return 404 for missing user', async () => {
    mockUser.deleteById.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await deleteUser(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'User not found' } });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.deleteById.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await deleteUser(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── toggleAdmin ──────────────────────────────────────────────────────────────
describe('toggleAdmin', () => {
  test('should toggle admin status from false to true', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 5, isAdmin: false });
    mockPrisma.user.update.mockResolvedValue({ id: 5, username: 'bob', isAdmin: true });

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await toggleAdmin(req, res, next);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isAdmin: true },
      select: { id: true, username: true, isAdmin: true },
    });
    expect(res._json).toEqual({ user: { id: 5, username: 'bob', isAdmin: true } });
  });

  test('should toggle admin status from true to false', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 5, isAdmin: true });
    mockPrisma.user.update.mockResolvedValue({ id: 5, username: 'bob', isAdmin: false });

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await toggleAdmin(req, res, next);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isAdmin: false },
      select: { id: true, username: true, isAdmin: true },
    });
    expect(res._json).toEqual({ user: { id: 5, username: 'bob', isAdmin: false } });
  });

  test('should return 404 for missing user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await toggleAdmin(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'User not found' } });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockPrisma.user.findUnique.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await toggleAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── listDataRequests ─────────────────────────────────────────────────────────
describe('listDataRequests', () => {
  test('should return pending requests', async () => {
    const requests = [{ id: 1, type: 'export', status: 'pending' }];
    mockDataRequest.getPending.mockResolvedValue(requests);

    const { req, res, next } = createReqRes();
    await listDataRequests(req, res, next);

    expect(res._json).toEqual({ requests });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockDataRequest.getPending.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await listDataRequests(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── processDataRequest ───────────────────────────────────────────────────────
describe('processDataRequest', () => {
  test('should return 404 if request not found', async () => {
    mockDataRequest.findById.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '99' } });
    await processDataRequest(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'Request not found' } });
  });

  test('should process export request', async () => {
    mockDataRequest.findById.mockResolvedValue({ id: 1, type: 'export', userId: 42 });
    mockDataRequest.updateStatus.mockResolvedValue(true);
    mockDataExportService.exportUserData.mockResolvedValue({
      data: '{}', extension: 'json', contentType: 'application/json',
    });
    mockNotificationService.dataRequestCompleted.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await processDataRequest(req, res, next);

    expect(mockDataRequest.updateStatus).toHaveBeenCalledWith(1, 'processing');
    expect(mockDataExportService.exportUserData).toHaveBeenCalledWith(42, 'json');
    expect(mockDataRequest.updateStatus).toHaveBeenCalledWith(1, 'completed', '/api/admin/data-requests/1/download');
    expect(mockNotificationService.dataRequestCompleted).toHaveBeenCalledWith(42, 'export');
    expect(res._json).toEqual({ message: 'Export completed', fileUrl: '/api/admin/data-requests/1/download' });
  });

  test('should process delete request', async () => {
    mockDataRequest.findById.mockResolvedValue({ id: 2, type: 'delete', userId: 42 });
    mockDataRequest.updateStatus.mockResolvedValue(true);
    mockUser.deleteById.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: '2' } });
    await processDataRequest(req, res, next);

    expect(mockUser.deleteById).toHaveBeenCalledWith(42);
    expect(mockDataRequest.updateStatus).toHaveBeenCalledWith(2, 'completed');
    expect(res._json).toEqual({ message: 'User account deleted' });
  });

  test('should return 400 for unknown request type', async () => {
    mockDataRequest.findById.mockResolvedValue({ id: 3, type: 'weird', userId: 42 });
    mockDataRequest.updateStatus.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: '3' } });
    await processDataRequest(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Unknown request type' } });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockDataRequest.findById.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await processDataRequest(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
