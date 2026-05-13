import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import Comment from '../../../src/models/Comment.js';
import prisma from '#config/prisma.js';

jest.mock('#config/prisma.js', () => ({
  default: {
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    post: {
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Comment Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create a comment and update post comment count', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Great post!',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        author: {
          username: 'john_doe',
          avatar: 'avatar.jpg',
        },
      };

      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            create: jest.fn().mockResolvedValue(mockComment),
            count: jest.fn().mockResolvedValue(3),
          },
          post: {
            update: jest.fn().mockResolvedValue({ id: 100, commentsCount: 3 }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      const result = await Comment.create({
        postId: 100,
        authorId: 50,
        content: 'Great post!',
      });

      expect(result).toEqual({
        id: 1,
        post_id: 100,
        author_id: 50,
        content: 'Great post!',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        author_username: 'john_doe',
        author_avatar: 'avatar.jpg',
      });
    });

    test('should handle missing author data', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Comment',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        author: null,
      };

      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            create: jest.fn().mockResolvedValue(mockComment),
            count: jest.fn().mockResolvedValue(1),
          },
          post: {
            update: jest.fn().mockResolvedValue({ id: 100, commentsCount: 1 }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      const result = await Comment.create({
        postId: 100,
        authorId: 50,
        content: 'Comment',
      });

      expect(result.author_username).toBeUndefined();
      expect(result.author_avatar).toBeUndefined();
    });

    test('should convert postId and authorId to numbers', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { username: 'user', avatar: 'avatar' },
      };

      let capturedTxData = null;
      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            create: jest.fn().mockImplementation((input) => {
              capturedTxData = input;
              return mockComment;
            }),
            count: jest.fn().mockResolvedValue(1),
          },
          post: {
            update: jest.fn().mockResolvedValue({ id: 100, commentsCount: 1 }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      await Comment.create({
        postId: '100',
        authorId: '50',
        content: 'Test',
      });

      expect(capturedTxData.data.postId).toBe(100);
      expect(capturedTxData.data.authorId).toBe(50);
    });
  });

  describe('getByPost', () => {
    test('should fetch comments for a post', async () => {
      const mockComments = [
        {
          id: 1,
          postId: 100,
          authorId: 50,
          content: 'First comment',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          author: { username: 'user1', avatar: 'avatar1.jpg' },
        },
        {
          id: 2,
          postId: 100,
          authorId: 51,
          content: 'Second comment',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          author: { username: 'user2', avatar: 'avatar2.jpg' },
        },
      ];

      prisma.comment.findMany.mockResolvedValue(mockComments);

      const result = await Comment.getByPost(100);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: 100 },
          orderBy: { createdAt: 'asc' },
          take: 50,
          skip: 0,
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].author_username).toBe('user1');
    });

    test('should support custom limit and offset', async () => {
      prisma.comment.findMany.mockResolvedValue([]);

      await Comment.getByPost(100, { limit: 20, offset: 10 });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });

    test('should convert postId to number', async () => {
      prisma.comment.findMany.mockResolvedValue([]);

      await Comment.getByPost('100');

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: 100 },
        })
      );
    });

    test('should return empty array when post has no comments', async () => {
      prisma.comment.findMany.mockResolvedValue([]);

      const result = await Comment.getByPost(100);

      expect(result).toEqual([]);
    });

    test('should shape all comments in response', async () => {
      const mockComments = [
        {
          id: 1,
          postId: 100,
          authorId: 50,
          content: 'Comment 1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          author: { username: 'user1', avatar: 'avatar1.jpg' },
        },
      ];

      prisma.comment.findMany.mockResolvedValue(mockComments);

      const result = await Comment.getByPost(100);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          post_id: 100,
          author_id: 50,
          author_username: 'user1',
          author_avatar: 'avatar1.jpg',
        })
      );
    });
  });

  describe('delete', () => {
    test('should delete comment and update post count', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'To delete',
      };

      prisma.comment.findUnique.mockResolvedValue(mockComment);

      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            delete: jest.fn().mockResolvedValue(mockComment),
            count: jest.fn().mockResolvedValue(2),
          },
          post: {
            update: jest.fn().mockResolvedValue({ id: 100, commentsCount: 2 }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      const result = await Comment.delete(1, 50);

      expect(result).toBe(true);
      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    test('should return false if comment not found', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      const result = await Comment.delete(999, 50);

      expect(result).toBe(false);
    });

    test('should return false if user is not the comment author', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Comment',
      };

      prisma.comment.findUnique.mockResolvedValue(mockComment);

      const result = await Comment.delete(1, 99);

      expect(result).toBe(false);
    });

    test('should convert id and authorId to numbers', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Comment',
      };

      prisma.comment.findUnique.mockResolvedValue(mockComment);

      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            delete: jest.fn().mockResolvedValue(mockComment),
            count: jest.fn().mockResolvedValue(0),
          },
          post: {
            update: jest.fn().mockResolvedValue({ id: 100, commentsCount: 0 }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      await Comment.delete('1', '50');

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    test('should update post comment count after deletion', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Comment',
      };

      prisma.comment.findUnique.mockResolvedValue(mockComment);

      let postUpdateInput = null;
      const mockTransaction = jest.fn(async (callback) => {
        const txMock = {
          comment: {
            delete: jest.fn().mockResolvedValue(mockComment),
            count: jest.fn().mockResolvedValue(1),
          },
          post: {
            update: jest.fn().mockImplementation((input) => {
              postUpdateInput = input;
              return { id: 100, commentsCount: 1 };
            }),
          },
        };
        return callback(txMock);
      });

      prisma.$transaction = mockTransaction;

      await Comment.delete(1, 50);

      expect(postUpdateInput.data.commentsCount).toBe(1);
      expect(postUpdateInput.where.id).toBe(100);
    });
  });

  describe('shapeComment', () => {
    test('should transform comment data structure', async () => {
      const mockComment = {
        id: 1,
        postId: 100,
        authorId: 50,
        content: 'Test comment',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        author: {
          username: 'testuser',
          avatar: 'test.jpg',
        },
      };

      prisma.comment.findMany.mockResolvedValue([mockComment]);

      const result = await Comment.getByPost(100);

      expect(result[0]).toEqual({
        id: 1,
        post_id: 100,
        author_id: 50,
        content: 'Test comment',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        author_username: 'testuser',
        author_avatar: 'test.jpg',
      });
    });
  });
});
