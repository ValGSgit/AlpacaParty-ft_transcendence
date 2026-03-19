/**
 * Post Model Unit Tests — verifies snake_case field mapping
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPost = {
  id: 1,
  authorId: 42,
  content: 'Hello world',
  imageUrl: '/uploads/test.jpg',
  isPublic: true,
  likesCount: 7,
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  author: { username: 'alice', avatar: '/avatars/alice.jpg' },
};

const mockPrisma = {
  post: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  postLike: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

jest.unstable_mockModule('../../../src/config/prisma.js', () => ({
  default: mockPrisma,
}));

const { default: Post } = await import('../../../src/models/Post.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Post.create — snake_case output', () => {
  test('returns snake_case fields', async () => {
    mockPrisma.post.create.mockResolvedValue(mockPost);
    const result = await Post.create({ authorId: 42, content: 'Hello world', imageUrl: '/uploads/test.jpg' });

    expect(result).toHaveProperty('author_id', 42);
    expect(result).toHaveProperty('image_url', '/uploads/test.jpg');
    expect(result).toHaveProperty('author_username', 'alice');
    expect(result).toHaveProperty('author_avatar', '/avatars/alice.jpg');
    expect(result).toHaveProperty('likes_count', 7);
    expect(result).toHaveProperty('created_at');
    expect(result).toHaveProperty('user_liked', false);
    // Ensure no leaked camelCase keys
    expect(result).not.toHaveProperty('authorId');
    expect(result).not.toHaveProperty('imageUrl');
    expect(result).not.toHaveProperty('authorUsername');
    expect(result).not.toHaveProperty('likesCount');
  });
});

describe('Post.findById', () => {
  test('returns snake_case fields when found', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const result = await Post.findById(1);
    expect(result.author_id).toBe(42);
    expect(result.image_url).toBe('/uploads/test.jpg');
  });

  test('returns null when not found', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    const result = await Post.findById(999);
    expect(result).toBeNull();
  });
});

describe('Post.getFeed', () => {
  test('returns posts with snake_case fields and user_liked flag', async () => {
    mockPrisma.post.findMany.mockResolvedValue([mockPost]);
    mockPrisma.postLike.findMany.mockResolvedValue([{ postId: 1 }]);

    const results = await Post.getFeed({ viewerId: 99 });
    expect(results).toHaveLength(1);
    expect(results[0].user_liked).toBe(true);
    expect(results[0].author_username).toBe('alice');
  });
});
