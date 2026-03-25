/**
 * Public API Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockUser = {
  findAll: jest.fn(),
  search: jest.fn(),
  findById: jest.fn(),
};
const mockGame = {
  getLeaderboard: jest.fn(),
};
const mockPost = {
  getFeed: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const mockOrganization = {
  findAll: jest.fn(),
  search: jest.fn(),
};

jest.unstable_mockModule('../../../src/models/User.js', () => ({ default: mockUser }));
jest.unstable_mockModule('../../../src/models/Game.js', () => ({ default: mockGame }));
jest.unstable_mockModule('../../../src/models/Post.js', () => ({ default: mockPost }));
jest.unstable_mockModule('../../../src/models/Organization.js', () => ({ default: mockOrganization }));

const {
  listUsers, getUser, getLeaderboard, getPosts,
  createPost, updatePost, deletePost,
  listOrganizations, getMockDataset,
} = await import('../../../src/controllers/publicApiController.js');

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

// ── listUsers ────────────────────────────────────────────────────────────────
describe('listUsers', () => {
  test('returns public users with default pagination', async () => {
    const users = [
      { id: 1, username: 'alice', avatar: '/a.png', bio: 'hi', status: 'online', level: 5, xp: 100, isOnline: true, isPublic: true, createdAt: '2024-01-01' },
      { id: 2, username: 'bob', avatar: '/b.png', bio: 'yo', status: 'away', level: 3, xp: 50, isOnline: false, isPublic: true, createdAt: '2024-02-01' },
    ];
    mockUser.findAll.mockResolvedValue(users);
    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);
    expect(mockUser.findAll).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(res._json.users).toHaveLength(2);
    expect(res._json.users[0].username).toBe('alice');
  });

  test('filters out private users', async () => {
    mockUser.findAll.mockResolvedValue([
      { id: 1, username: 'pub', isPublic: true, level: 1, xp: 0, isOnline: false, createdAt: '2024-01-01' },
      { id: 2, username: 'priv', isPublic: false, level: 1, xp: 0, isOnline: false, createdAt: '2024-01-01' },
    ]);
    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);
    expect(res._json.users).toHaveLength(1);
    expect(res._json.users[0].username).toBe('pub');
  });

  test('uses search when search param provided', async () => {
    mockUser.search.mockResolvedValue([
      { id: 1, username: 'alice', isPublic: true, level: 1, xp: 0, isOnline: false, createdAt: '2024-01-01' },
    ]);
    const { req, res, next } = createReqRes({ query: { search: 'ali', limit: '10', offset: '5' } });
    await listUsers(req, res, next);
    expect(mockUser.search).toHaveBeenCalledWith('ali', { limit: 10, offset: 5 });
    expect(mockUser.findAll).not.toHaveBeenCalled();
  });

  test('applies anonymization when anonymized=true', async () => {
    mockUser.findAll.mockResolvedValue([
      { id: 3, username: 'alice', avatar: '/a.png', bio: 'real bio', status: 'online', level: 5, xp: 100, isOnline: true, isPublic: true, createdAt: '2024-01-01' },
    ]);
    const { req, res, next } = createReqRes({ query: { anonymized: 'true' } });
    await listUsers(req, res, next);
    expect(res._json.users[0].username).toBe('user_0003');
    expect(res._json.users[0].avatar).toBe('/avatars/default.svg');
    expect(res._json.users[0].bio).toBe('Anonymized profile for public API testing');
  });

  test('anonymized=1 also triggers anonymization', async () => {
    mockUser.findAll.mockResolvedValue([
      { id: 1, username: 'alice', avatar: '/a.png', bio: 'bio', status: 'online', level: 1, xp: 0, isOnline: true, isPublic: true, createdAt: '2024-01-01' },
    ]);
    const { req, res, next } = createReqRes({ query: { anonymized: '1' } });
    await listUsers(req, res, next);
    expect(res._json.users[0].username).toBe('user_0001');
  });

  test('calls next on error', async () => {
    const err = new Error('db down');
    mockUser.findAll.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listUsers(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getUser ──────────────────────────────────────────────────────────────────
describe('getUser', () => {
  test('returns user when found and public', async () => {
    mockUser.findById.mockResolvedValue({
      id: 1, username: 'alice', avatar: '/a.png', bio: 'hi', status: 'online',
      level: 5, xp: 100, isOnline: true, isPublic: true, createdAt: '2024-01-01',
    });
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await getUser(req, res, next);
    expect(res._json.user.username).toBe('alice');
  });

  test('returns 404 for private user', async () => {
    mockUser.findById.mockResolvedValue({ id: 1, isPublic: false });
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await getUser(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('User not found');
  });

  test('returns 404 for missing user', async () => {
    mockUser.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await getUser(req, res, next);
    expect(res._status).toBe(404);
  });

  test('applies anonymization', async () => {
    mockUser.findById.mockResolvedValue({
      id: 5, username: 'alice', avatar: '/a.png', bio: 'hi', status: 'online',
      level: 5, xp: 100, isOnline: true, isPublic: true, createdAt: '2024-01-01',
    });
    const { req, res, next } = createReqRes({ params: { id: '5' }, query: { anonymized: 'yes' } });
    await getUser(req, res, next);
    expect(res._json.user.username).toBe('user_0005');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockUser.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await getUser(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getLeaderboard ───────────────────────────────────────────────────────────
describe('getLeaderboard', () => {
  test('returns leaderboard data with defaults', async () => {
    const rows = [
      { userId: 1, username: 'alice', avatar: '/a.png', elo: 1200, wins: 10, losses: 5, draws: 2 },
    ];
    mockGame.getLeaderboard.mockResolvedValue(rows);
    const { req, res, next } = createReqRes();
    await getLeaderboard(req, res, next);
    expect(mockGame.getLeaderboard).toHaveBeenCalledWith('spit_royale', { limit: 20, offset: 0, publicOnly: true });
    expect(res._json.leaderboard).toHaveLength(1);
    expect(res._json.leaderboard[0].username).toBe('alice');
  });

  test('applies anonymization to leaderboard', async () => {
    mockGame.getLeaderboard.mockResolvedValue([
      { userId: 2, username: 'bob', avatar: '/b.png', elo: 1100 },
    ]);
    const { req, res, next } = createReqRes({ query: { anonymized: 'true' } });
    await getLeaderboard(req, res, next);
    expect(res._json.leaderboard[0].username).toBe('user_0002');
    expect(res._json.leaderboard[0].avatar).toBe('/avatars/default.svg');
  });

  test('passes custom gameType and pagination', async () => {
    mockGame.getLeaderboard.mockResolvedValue([]);
    const { req, res, next } = createReqRes({ query: { gameType: 'chess', limit: '5', offset: '10' } });
    await getLeaderboard(req, res, next);
    expect(mockGame.getLeaderboard).toHaveBeenCalledWith('chess', { limit: 5, offset: 10, publicOnly: true });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockGame.getLeaderboard.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getLeaderboard(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getPosts ─────────────────────────────────────────────────────────────────
describe('getPosts', () => {
  test('returns posts with defaults', async () => {
    const posts = [
      { id: 1, author_id: 1, author_username: 'alice', author_avatar: '/a.png', content: 'hello', likes_count: 5 },
    ];
    mockPost.getFeed.mockResolvedValue(posts);
    const { req, res, next } = createReqRes();
    await getPosts(req, res, next);
    expect(mockPost.getFeed).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(res._json.posts[0].content).toBe('hello');
  });

  test('applies anonymization to posts', async () => {
    mockPost.getFeed.mockResolvedValue([
      { id: 1, author_id: 3, author_username: 'alice', author_avatar: '/a.png', content: 'secret' },
    ]);
    const { req, res, next } = createReqRes({ query: { anonymized: 'true' } });
    await getPosts(req, res, next);
    expect(res._json.posts[0].author_username).toBe('user_0003');
    expect(res._json.posts[0].content).toBe('[anonymized post content]');
    expect(res._json.posts[0].author_avatar).toBe('/avatars/default.svg');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockPost.getFeed.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getPosts(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── createPost ───────────────────────────────────────────────────────────────
describe('createPost', () => {
  test('creates post successfully', async () => {
    const post = { id: 1, content: 'hello', authorId: 1 };
    mockPost.create.mockResolvedValue(post);
    const { req, res, next } = createReqRes({ body: { content: 'hello', authorId: 1 } });
    await createPost(req, res, next);
    expect(res._status).toBe(201);
    expect(res._json.post).toEqual(post);
    expect(mockPost.create).toHaveBeenCalledWith({ authorId: 1, content: 'hello', imageUrl: null });
  });

  test('returns 400 when content is missing', async () => {
    const { req, res, next } = createReqRes({ body: { authorId: 1 } });
    await createPost(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('content is required');
  });

  test('returns 400 when content is empty string', async () => {
    const { req, res, next } = createReqRes({ body: { content: '   ', authorId: 1 } });
    await createPost(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('content is required');
  });

  test('returns 400 when authorId is missing', async () => {
    const { req, res, next } = createReqRes({ body: { content: 'hello' } });
    await createPost(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('authorId is required');
  });

  test('passes imageUrl when provided', async () => {
    mockPost.create.mockResolvedValue({ id: 1 });
    const { req, res, next } = createReqRes({ body: { content: 'hello', authorId: 1, imageUrl: '/img.png' } });
    await createPost(req, res, next);
    expect(mockPost.create).toHaveBeenCalledWith({ authorId: 1, content: 'hello', imageUrl: '/img.png' });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockPost.create.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ body: { content: 'hi', authorId: 1 } });
    await createPost(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── updatePost ───────────────────────────────────────────────────────────────
describe('updatePost', () => {
  test('updates post successfully', async () => {
    const existing = { id: 1, author_id: 2, content: 'old' };
    mockPost.findById.mockResolvedValue(existing);
    mockPost.update.mockResolvedValue({ id: 1, content: 'new' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { content: 'new' } });
    await updatePost(req, res, next);
    expect(mockPost.update).toHaveBeenCalledWith(1, 2, { content: 'new', imageUrl: undefined });
    expect(res._json.post.content).toBe('new');
  });

  test('returns 404 when post not found', async () => {
    mockPost.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' }, body: { content: 'new' } });
    await updatePost(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('Post not found');
  });

  test('returns 400 when nothing to update', async () => {
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: {} });
    await updatePost(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Nothing to update');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockPost.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { content: 'x' } });
    await updatePost(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── deletePost ───────────────────────────────────────────────────────────────
describe('deletePost', () => {
  test('deletes post successfully', async () => {
    mockPost.findById.mockResolvedValue({ id: 1, author_id: 2 });
    mockPost.delete.mockResolvedValue(true);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deletePost(req, res, next);
    expect(mockPost.delete).toHaveBeenCalledWith(1, 2);
    expect(res._json.message).toBe('Post deleted');
  });

  test('returns 404 when post not found', async () => {
    mockPost.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await deletePost(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('Post not found');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockPost.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deletePost(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── listOrganizations ────────────────────────────────────────────────────────
describe('listOrganizations', () => {
  test('returns all organizations with defaults', async () => {
    const orgs = [{ id: 1, name: 'Org1', description: 'desc' }];
    mockOrganization.findAll.mockResolvedValue(orgs);
    const { req, res, next } = createReqRes();
    await listOrganizations(req, res, next);
    expect(mockOrganization.findAll).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(res._json.organizations).toEqual(orgs);
  });

  test('uses search when provided', async () => {
    mockOrganization.search.mockResolvedValue([{ id: 1, name: 'Alpaca' }]);
    const { req, res, next } = createReqRes({ query: { search: 'alp', limit: '5' } });
    await listOrganizations(req, res, next);
    expect(mockOrganization.search).toHaveBeenCalledWith('alp', { limit: 5 });
    expect(mockOrganization.findAll).not.toHaveBeenCalled();
  });

  test('applies anonymization', async () => {
    mockOrganization.findAll.mockResolvedValue([{ id: 7, name: 'Secret Org', description: 'hidden' }]);
    const { req, res, next } = createReqRes({ query: { anonymized: 'true' } });
    await listOrganizations(req, res, next);
    expect(res._json.organizations[0].name).toBe('org_7');
    expect(res._json.organizations[0].description).toBe('Anonymized organization');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.findAll.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listOrganizations(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getMockDataset ───────────────────────────────────────────────────────────
describe('getMockDataset', () => {
  test('returns combined anonymized data', async () => {
    mockUser.findAll.mockResolvedValue([
      { id: 1, username: 'alice', avatar: '/a.png', bio: 'hi', status: 'on', level: 5, xp: 100, isOnline: true, isPublic: true, createdAt: '2024-01-01' },
    ]);
    mockGame.getLeaderboard.mockResolvedValue([
      { userId: 1, username: 'alice', avatar: '/a.png', elo: 1200, wins: 10, losses: 5, draws: 2 },
    ]);
    mockPost.getFeed.mockResolvedValue([
      { id: 1, author_id: 1, author_username: 'alice', author_avatar: '/a.png', content: 'hello', created_at: '2024-01-01', likes_count: 3 },
    ]);
    mockOrganization.findAll.mockResolvedValue([{ id: 1, name: 'Org1', description: 'desc' }]);

    const { req, res, next } = createReqRes();
    await getMockDataset(req, res, next);

    expect(res._json.users[0].username).toBe('user_0001');
    expect(res._json.leaderboard[0].username).toBe('user_0001');
    expect(res._json.leaderboard[0].avatar).toBe('/avatars/default.svg');
    expect(res._json.posts[0].content).toBe('[anonymized post content]');
    expect(res._json.organizations[0].name).toBe('org_1');
    expect(res._json.disclaimer).toBe('Mock dataset is anonymized and is not user personal data.');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockUser.findAll.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await getMockDataset(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
