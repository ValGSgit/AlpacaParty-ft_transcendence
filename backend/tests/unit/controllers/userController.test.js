import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockUser = {
  findById: jest.fn(),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  findByIdWithPassword: jest.fn(),
  findAll: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
  deleteById: jest.fn(),
  count: jest.fn(),
};
const mockShapeUserForClient = jest.fn((u) => u);
jest.unstable_mockModule('../../../src/models/User.js', () => ({
  default: mockUser,
  shapeUserForClient: mockShapeUserForClient,
}));

const mockAuthService = {
  comparePassword: jest.fn(),
  validatePassword: jest.fn(),
  hashPassword: jest.fn(),
};
jest.unstable_mockModule('../../../src/services/authService.js', () => ({
  default: mockAuthService,
}));

const mockDataExportService = {
  exportUserData: jest.fn(),
};
jest.unstable_mockModule('../../../src/services/dataExportService.js', () => ({
  default: mockDataExportService,
}));

const mockDataRequest = {
  getByUser: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/DataRequest.js', () => ({
  default: mockDataRequest,
}));

const mockNotificationService = {
  notify: jest.fn().mockResolvedValue(true),
};
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  default: mockNotificationService,
}));

const mockFriend = {
  areFriends: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/Friend.js', () => ({
  default: mockFriend,
}));

const mockConfig = {
  uploads: { dir: '/tmp/uploads' },
};
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  default: mockConfig,
}));

// Mock fs, path, crypto, and @huggingface/inference to prevent import errors
jest.unstable_mockModule('fs', () => ({
  default: { mkdirSync: jest.fn(), writeFileSync: jest.fn() },
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.unstable_mockModule('@huggingface/inference', () => ({
  InferenceClient: jest.fn(),
}));

const {
  getMe, updateMe, changePassword, getUser, listUsers,
  exportMyData, requestDeletion, listDataRequests, deleteMe,
} = await import('../../../src/controllers/userController.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function createReqRes(overrides = {}) {
  const req = {
    user: { id: 1, username: 'alice', email: 'alice@test.com', isAdmin: false },
    params: {}, query: {}, body: {},
    ...overrides,
  };
  const res = {
    _status: 200,
    _json: null,
    _sent: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
    send(data) { res._sent = data; return res; },
    setHeader(key, val) { res._headers[key] = val; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getMe ────────────────────────────────────────────────────────────────────
describe('getMe', () => {
  test('should return shaped user', async () => {
    const user = { id: 1, username: 'alice' };
    const { req, res } = createReqRes({ user });
    await getMe(req, res);

    expect(mockShapeUserForClient).toHaveBeenCalledWith(user);
    expect(res._json).toEqual({ user });
  });
});

// ── updateMe ─────────────────────────────────────────────────────────────────
describe('updateMe', () => {
  test('should reject bio longer than 500 characters', async () => {
    const { req, res, next } = createReqRes({ body: { bio: 'a'.repeat(501) } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Bio must be 500 characters or fewer' } });
  });

  test('should reject status longer than 200 characters', async () => {
    const { req, res, next } = createReqRes({ body: { status: 'a'.repeat(201) } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Status must be 200 characters or fewer' } });
  });

  test('should reject username shorter than 3 characters', async () => {
    const { req, res, next } = createReqRes({ body: { username: 'ab' } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Username must be 3-32 characters' } });
  });

  test('should reject username longer than 32 characters', async () => {
    const { req, res, next } = createReqRes({ body: { username: 'a'.repeat(33) } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Username must be 3-32 characters' } });
  });

  test('should reject username with invalid characters', async () => {
    const { req, res, next } = createReqRes({ body: { username: 'bad user!' } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      error: { message: 'Username may only contain letters, numbers, hyphens and underscores' },
    });
  });

  test('should reject already taken username', async () => {
    mockUser.findByUsername.mockResolvedValue({ id: 99, username: 'bob' });

    const { req, res, next } = createReqRes({ body: { username: 'bob' } });
    await updateMe(req, res, next);

    expect(res._status).toBe(409);
    expect(res._json).toEqual({ error: { message: 'Username already taken' } });
  });

  test('should skip username uniqueness check if same as current', async () => {
    mockUser.update.mockResolvedValue({ id: 1, username: 'alice' });

    const { req, res, next } = createReqRes({ body: { username: 'alice' } });
    await updateMe(req, res, next);

    expect(mockUser.findByUsername).not.toHaveBeenCalled();
    expect(res._json).toBeDefined();
  });

  test('should reject already registered email', async () => {
    mockUser.findByEmail.mockResolvedValue({ id: 99, email: 'bob@test.com' });

    const { req, res, next } = createReqRes({ body: { email: 'bob@test.com' } });
    await updateMe(req, res, next);

    expect(res._status).toBe(409);
    expect(res._json).toEqual({ error: { message: 'Email already registered' } });
  });

  test('should reject email longer than 254 characters', async () => {
    const { req, res, next } = createReqRes({ body: { email: 'a'.repeat(250) + '@b.com' } });
    await updateMe(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Email must be 254 characters or fewer' } });
  });

  test('should skip email uniqueness check if same as current', async () => {
    mockUser.update.mockResolvedValue({ id: 1, email: 'alice@test.com' });

    const { req, res, next } = createReqRes({ body: { email: 'alice@test.com' } });
    await updateMe(req, res, next);

    expect(mockUser.findByEmail).not.toHaveBeenCalled();
  });

  test('should update user successfully', async () => {
    const updatedUser = { id: 1, username: 'alice', bio: 'new bio' };
    mockUser.update.mockResolvedValue(updatedUser);

    const { req, res, next } = createReqRes({ body: { bio: 'new bio' } });
    await updateMe(req, res, next);

    expect(mockUser.update).toHaveBeenCalledWith(1, expect.objectContaining({ bio: 'new bio' }));
    expect(mockShapeUserForClient).toHaveBeenCalledWith(updatedUser);
    expect(res._json).toEqual({ user: updatedUser });
  });

  test('should map is_public to isPublic', async () => {
    mockUser.update.mockResolvedValue({ id: 1 });

    const { req, res, next } = createReqRes({ body: { is_public: false } });
    await updateMe(req, res, next);

    expect(mockUser.update).toHaveBeenCalledWith(1, expect.objectContaining({ isPublic: false }));
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.update.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ body: { bio: 'hello' } });
    await updateMe(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── changePassword ───────────────────────────────────────────────────────────
describe('changePassword', () => {
  test('should reject when currentPassword is missing', async () => {
    const { req, res, next } = createReqRes({ body: { newPassword: 'Abc12345!' } });
    await changePassword(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'currentPassword and newPassword are required' } });
  });

  test('should reject when newPassword is missing', async () => {
    const { req, res, next } = createReqRes({ body: { currentPassword: 'old' } });
    await changePassword(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'currentPassword and newPassword are required' } });
  });

  test('should reject wrong current password', async () => {
    mockUser.findByIdWithPassword.mockResolvedValue({ id: 1, passwordHash: 'hash' });
    mockAuthService.comparePassword.mockResolvedValue(false);

    const { req, res, next } = createReqRes({
      body: { currentPassword: 'wrong', newPassword: 'New12345!' },
    });
    await changePassword(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: { message: 'Current password is incorrect' } });
  });

  test('should reject invalid new password', async () => {
    mockUser.findByIdWithPassword.mockResolvedValue({ id: 1, passwordHash: 'hash' });
    mockAuthService.comparePassword.mockResolvedValue(true);
    mockAuthService.validatePassword.mockReturnValue({ valid: false, errors: ['Too short', 'Needs number'] });

    const { req, res, next } = createReqRes({
      body: { currentPassword: 'correct', newPassword: 'bad' },
    });
    await changePassword(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: 'Too short. Needs number' } });
  });

  test('should update password successfully', async () => {
    mockUser.findByIdWithPassword.mockResolvedValue({ id: 1, passwordHash: 'hash' });
    mockAuthService.comparePassword.mockResolvedValue(true);
    mockAuthService.validatePassword.mockReturnValue({ valid: true, errors: [] });
    mockAuthService.hashPassword.mockResolvedValue('newhash');
    mockUser.updatePassword.mockResolvedValue(true);

    const { req, res, next } = createReqRes({
      body: { currentPassword: 'correct', newPassword: 'NewPass123!' },
    });
    await changePassword(req, res, next);

    expect(mockAuthService.hashPassword).toHaveBeenCalledWith('NewPass123!');
    expect(mockUser.updatePassword).toHaveBeenCalledWith(1, 'newhash');
    expect(res._json).toEqual({ message: 'Password updated' });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.findByIdWithPassword.mockRejectedValue(error);

    const { req, res, next } = createReqRes({
      body: { currentPassword: 'a', newPassword: 'b' },
    });
    await changePassword(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── getUser ──────────────────────────────────────────────────────────────────
describe('getUser', () => {
  test('should return user', async () => {
    const user = { id: 5, username: 'bob', isPublic: true };
    mockUser.findById.mockResolvedValue(user);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await getUser(req, res, next);

    expect(res._json).toBeDefined();
    expect(res._json.user).toBeDefined();
  });

  test('should return 404 if user not found', async () => {
    mockUser.findById.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await getUser(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'User not found' } });
  });

  test('should return 403 for private profile of non-friend', async () => {
    const user = { id: 5, username: 'bob', isPublic: false };
    mockUser.findById.mockResolvedValue(user);
    mockFriend.areFriends.mockResolvedValue(false);

    const { req, res, next } = createReqRes({
      params: { id: '5' },
      user: { id: 1, username: 'alice', isAdmin: false },
    });
    await getUser(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: { message: 'This profile is private' } });
  });

  test('should allow viewing private profile if friends', async () => {
    const user = { id: 5, username: 'bob', isPublic: false };
    mockUser.findById.mockResolvedValue(user);
    mockFriend.areFriends.mockResolvedValue(true);

    const { req, res, next } = createReqRes({
      params: { id: '5' },
      user: { id: 1, username: 'alice', isAdmin: false },
    });
    await getUser(req, res, next);

    expect(res._status).toBe(200);
    expect(res._json.user).toBeDefined();
  });

  test('should allow admin to view private profile', async () => {
    const user = { id: 5, username: 'bob', isPublic: false };
    mockUser.findById.mockResolvedValue(user);

    const { req, res, next } = createReqRes({
      params: { id: '5' },
      user: { id: 1, username: 'admin', isAdmin: true },
    });
    await getUser(req, res, next);

    expect(res._status).toBe(200);
    expect(res._json.user).toBeDefined();
    expect(mockFriend.areFriends).not.toHaveBeenCalled();
  });

  test('should allow viewing own private profile', async () => {
    const user = { id: 1, username: 'alice', isPublic: false };
    mockUser.findById.mockResolvedValue(user);

    const { req, res, next } = createReqRes({
      params: { id: '1' },
      user: { id: 1, username: 'alice', isAdmin: false },
    });
    await getUser(req, res, next);

    expect(res._status).toBe(200);
    expect(res._json.user).toBeDefined();
    expect(mockFriend.areFriends).not.toHaveBeenCalled();
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.findById.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await getUser(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── listUsers ────────────────────────────────────────────────────────────────
describe('listUsers', () => {
  test('should return users', async () => {
    const users = [
      { id: 1, username: 'alice', isPublic: true },
      { id: 2, username: 'bob', isPublic: true },
    ];
    mockUser.findAll.mockResolvedValue(users);

    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);

    expect(res._json.users).toHaveLength(2);
  });

  test('should filter non-public users for non-admins', async () => {
    const users = [
      { id: 1, username: 'alice', isPublic: true },
      { id: 2, username: 'bob', isPublic: false },
      { id: 3, username: 'charlie', isPublic: true },
    ];
    mockUser.findAll.mockResolvedValue(users);

    const { req, res, next } = createReqRes({
      user: { id: 1, username: 'alice', isAdmin: false },
    });
    await listUsers(req, res, next);

    // Should include alice (own profile) and charlie (public), but not bob (private, not own)
    expect(res._json.users).toHaveLength(2);
    expect(res._json.users.map((u) => u.id)).toEqual([1, 3]);
  });

  test('should show all users for admins', async () => {
    const users = [
      { id: 1, username: 'alice', isPublic: true },
      { id: 2, username: 'bob', isPublic: false },
    ];
    mockUser.findAll.mockResolvedValue(users);

    const { req, res, next } = createReqRes({
      user: { id: 1, username: 'alice', isAdmin: true },
    });
    await listUsers(req, res, next);

    expect(res._json.users).toHaveLength(2);
  });

  test('should use search when query param provided', async () => {
    mockUser.search.mockResolvedValue([{ id: 2, username: 'bob', isPublic: true }]);

    const { req, res, next } = createReqRes({
      query: { search: 'bob', limit: '10' },
      user: { id: 1, username: 'alice', isAdmin: true },
    });
    await listUsers(req, res, next);

    expect(mockUser.search).toHaveBeenCalledWith('bob', { limit: 10 });
    expect(res._json.users).toHaveLength(1);
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.findAll.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── deleteMe ─────────────────────────────────────────────────────────────────
describe('deleteMe', () => {
  test('should delete user', async () => {
    mockUser.deleteById.mockResolvedValue(true);

    const { req, res, next } = createReqRes();
    await deleteMe(req, res, next);

    expect(mockUser.deleteById).toHaveBeenCalledWith(1);
    expect(res._json).toEqual({ message: 'Account deleted', logout: true });
  });

  test('should return 404 if user not found', async () => {
    mockUser.deleteById.mockResolvedValue(null);

    const { req, res, next } = createReqRes();
    await deleteMe(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'User not found' } });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockUser.deleteById.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await deleteMe(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── requestDeletion ──────────────────────────────────────────────────────────
describe('requestDeletion', () => {
  test('should create deletion request', async () => {
    mockDataRequest.getByUser.mockResolvedValue([]);
    const request = { id: 1, userId: 1, type: 'delete', status: 'pending' };
    mockDataRequest.create.mockResolvedValue(request);

    const { req, res, next } = createReqRes();
    await requestDeletion(req, res, next);

    expect(mockDataRequest.create).toHaveBeenCalledWith({ userId: 1, type: 'delete' });
    expect(mockNotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: 'data_request' }),
    );
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ request });
  });

  test('should reject if deletion request already pending', async () => {
    mockDataRequest.getByUser.mockResolvedValue([
      { id: 10, type: 'delete', status: 'pending' },
    ]);

    const { req, res, next } = createReqRes();
    await requestDeletion(req, res, next);

    expect(res._status).toBe(409);
    expect(res._json).toEqual({ error: { message: 'A deletion request is already pending' } });
    expect(mockDataRequest.create).not.toHaveBeenCalled();
  });

  test('should allow if existing deletion request is completed', async () => {
    mockDataRequest.getByUser.mockResolvedValue([
      { id: 10, type: 'delete', status: 'completed' },
    ]);
    mockDataRequest.create.mockResolvedValue({ id: 11 });

    const { req, res, next } = createReqRes();
    await requestDeletion(req, res, next);

    expect(mockDataRequest.create).toHaveBeenCalled();
    expect(res._status).toBe(201);
  });

  test('should allow if pending request is for export, not delete', async () => {
    mockDataRequest.getByUser.mockResolvedValue([
      { id: 10, type: 'export', status: 'pending' },
    ]);
    mockDataRequest.create.mockResolvedValue({ id: 11 });

    const { req, res, next } = createReqRes();
    await requestDeletion(req, res, next);

    expect(mockDataRequest.create).toHaveBeenCalled();
    expect(res._status).toBe(201);
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockDataRequest.getByUser.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await requestDeletion(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── listDataRequests ─────────────────────────────────────────────────────────
describe('listDataRequests', () => {
  test('should return requests for user', async () => {
    const requests = [{ id: 1, type: 'export', status: 'completed' }];
    mockDataRequest.getByUser.mockResolvedValue(requests);

    const { req, res, next } = createReqRes();
    await listDataRequests(req, res, next);

    expect(mockDataRequest.getByUser).toHaveBeenCalledWith(1);
    expect(res._json).toEqual({ requests });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockDataRequest.getByUser.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await listDataRequests(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── exportMyData ─────────────────────────────────────────────────────────────
describe('exportMyData', () => {
  test('should export user data as json by default', async () => {
    mockDataExportService.exportUserData.mockResolvedValue({
      data: '{"user":"data"}',
      contentType: 'application/json',
      extension: 'json',
    });

    const { req, res, next } = createReqRes({ query: {} });
    await exportMyData(req, res, next);

    expect(mockDataExportService.exportUserData).toHaveBeenCalledWith(1, 'json');
    expect(res._headers['Content-Type']).toBe('application/json');
    expect(res._sent).toBe('{"user":"data"}');
  });

  test('should respect format query param', async () => {
    mockDataExportService.exportUserData.mockResolvedValue({
      data: 'csv-data',
      contentType: 'text/csv',
      extension: 'csv',
    });

    const { req, res, next } = createReqRes({ query: { format: 'csv' } });
    await exportMyData(req, res, next);

    expect(mockDataExportService.exportUserData).toHaveBeenCalledWith(1, 'csv');
    expect(res._headers['Content-Type']).toBe('text/csv');
  });

  test('should default to json for invalid format', async () => {
    mockDataExportService.exportUserData.mockResolvedValue({
      data: '{}', contentType: 'application/json', extension: 'json',
    });

    const { req, res, next } = createReqRes({ query: { format: 'yaml' } });
    await exportMyData(req, res, next);

    expect(mockDataExportService.exportUserData).toHaveBeenCalledWith(1, 'json');
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockDataExportService.exportUserData.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ query: {} });
    await exportMyData(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
