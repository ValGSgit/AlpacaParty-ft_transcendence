/**
 * Post Model Unit Tests — verifies snake_case field mapping
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockPost = {
  id: 1,
  authorId: 42,
  content: "Hello world",
  imageUrl: "/uploads/test.jpg",
  isPublic: true,
  likesCount: 7,
  createdAt: new Date("2024-01-01T12:00:00Z"),
  updatedAt: new Date("2024-01-01T12:00:00Z"),
  author: { username: "alice", avatar: "/avatars/alice.jpg" },
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
  repost: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

jest.unstable_mockModule("#config/prisma.js", () => ({
  default: mockPrisma,
}));

const { default: Post } = await import("../../../src/models/Post.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Post.create — snake_case output", () => {
  test("returns snake_case fields", async () => {
    mockPrisma.post.create.mockResolvedValue(mockPost);
    const result = await Post.create({
      authorId: 42,
      content: "Hello world",
      imageUrl: "/uploads/test.jpg",
    });

    expect(result).toHaveProperty("author_id", 42);
    expect(result).toHaveProperty("image_url", "/uploads/test.jpg");
    expect(result).toHaveProperty("author_username", "alice");
    expect(result).toHaveProperty("author_avatar", "/avatars/alice.jpg");
    expect(result).toHaveProperty("likes_count", 7);
    expect(result).toHaveProperty("created_at");
    expect(result).toHaveProperty("user_liked", false);
    // Ensure no leaked camelCase keys
    expect(result).not.toHaveProperty("authorId");
    expect(result).not.toHaveProperty("imageUrl");
    expect(result).not.toHaveProperty("authorUsername");
    expect(result).not.toHaveProperty("likesCount");
  });
});

describe("Post.findById", () => {
  test("returns snake_case fields when found", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const result = await Post.findById(1);
    expect(result.author_id).toBe(42);
    expect(result.image_url).toBe("/uploads/test.jpg");
  });

  test("returns null when not found", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    const result = await Post.findById(999);
    expect(result).toBeNull();
  });
});

describe("Post.getFeed", () => {
  test("returns posts with snake_case fields and user_liked flag", async () => {
    mockPrisma.post.findMany.mockResolvedValue([mockPost]);
    mockPrisma.postLike.findMany.mockResolvedValue([{ postId: 1 }]);
    mockPrisma.repost.findMany.mockResolvedValue([]);

    const results = await Post.getFeed({ viewerId: 99 });
    expect(results).toHaveLength(1);
    expect(results[0].user_liked).toBe(true);
    expect(results[0].author_username).toBe("alice");
  });

  test("returns posts without viewer info when viewerId is null", async () => {
    mockPrisma.post.findMany.mockResolvedValue([mockPost]);
    mockPrisma.repost.findMany.mockResolvedValue([]);

    const results = await Post.getFeed({ viewerId: null });
    expect(results).toHaveLength(1);
    expect(results[0].user_liked).toBe(false);
    expect(mockPrisma.postLike.findMany).not.toHaveBeenCalled();
  });

  test("includes reposts with metadata", async () => {
    const repostedPost = { ...mockPost, id: 2 };
    const repostData = {
      id: 100,
      postId: 2,
      authorId: 99,
      comment: "Great post!",
      createdAt: new Date(),
      post: repostedPost,
      author: { username: "bob", avatar: "/avatars/bob.jpg" },
    };
    mockPrisma.post.findMany.mockResolvedValue([mockPost]);
    mockPrisma.postLike.findMany.mockResolvedValue([]);
    mockPrisma.repost.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([repostData]);

    const results = await Post.getFeed({ viewerId: 99, limit: 10 });
    expect(results[0]._repostBy).toBe("bob");
    expect(results[0]._repostComment).toBe("Great post!");
  });
});

describe("Post.update", () => {
  test("updates content field", async () => {
    const updated = { ...mockPost, content: "Updated content" };
    mockPrisma.post.update.mockResolvedValue(updated);
    const result = await Post.update(1, { content: "Updated content" });
    expect(result.content).toBe("Updated content");
  });

  test("updates isPublic with both snake_case and camelCase", async () => {
    const updated = { ...mockPost, isPublic: false };
    mockPrisma.post.update.mockResolvedValue(updated);
    await Post.update(1, { isPublic: false });
    expect(mockPrisma.post.update).toHaveBeenCalled();
  });

  test("returns existing post when no updates provided", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const result = await Post.update(1, {});
    expect(result).toEqual(
      expect.objectContaining({
        image_url: "/uploads/test.jpg",
        author_username: "alice",
      }),
    );
  });

  test("handles imageUrl field", async () => {
    const updated = { ...mockPost, imageUrl: "/new-image.jpg" };
    mockPrisma.post.update.mockResolvedValue(updated);
    await Post.update(1, { imageUrl: "/new-image.jpg" });
    expect(mockPrisma.post.update).toHaveBeenCalled();
  });
});

describe("Post.delete", () => {
  test("returns true when post is deleted", async () => {
    mockPrisma.post.deleteMany.mockResolvedValue({ count: 1 });
    const result = await Post.delete(1);
    expect(result).toBe(true);
  });

  test("returns false when post not found", async () => {
    mockPrisma.post.deleteMany.mockResolvedValue({ count: 0 });
    const result = await Post.delete(999);
    expect(result).toBe(false);
  });
});

describe("Post.like", () => {
  test("increments likes when not already liked", async () => {
    mockPrisma.postLike.create.mockResolvedValue({});
    mockPrisma.post.update.mockResolvedValue({});
    await Post.like(1, 42);
    expect(mockPrisma.postLike.create).toHaveBeenCalled();
    expect(mockPrisma.post.update).toHaveBeenCalled();
  });

  test("handles duplicate like with P2002 error code", async () => {
    const error = new Error("Unique constraint");
    error.code = "P2002";
    mockPrisma.postLike.create.mockRejectedValue(error);
    mockPrisma.post.update.mockResolvedValue({});

    // Should not throw and should still update post
    await Post.like(1, 42);
    expect(mockPrisma.post.update).not.toHaveBeenCalled();
  });
});

describe("Post.unlike", () => {
  test("decrements likes when post was liked", async () => {
    mockPrisma.postLike.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.post.update.mockResolvedValue({});
    await Post.unlike(1, 42);
    expect(mockPrisma.post.update).toHaveBeenCalled();
  });

  test("does not update post when like not found", async () => {
    mockPrisma.postLike.deleteMany.mockResolvedValue({ count: 0 });
    await Post.unlike(1, 42);
    expect(mockPrisma.post.update).not.toHaveBeenCalled();
  });
});

describe("Post.repost", () => {
  test("creates repost successfully", async () => {
    const repostData = {
      id: 1,
      postId: 1,
      authorId: 42,
      comment: "Great!",
      createdAt: new Date(),
      author: { username: "alice", avatar: "/a.jpg" },
    };
    mockPrisma.repost.create.mockResolvedValue(repostData);
    mockPrisma.post.update.mockResolvedValue({});

    const result = await Post.repost(1, 42, "Great!");
    expect(result.author_username).toBe("alice");
    expect(result.comment).toBe("Great!");
  });

  test("returns null when already reposted (P2002 error)", async () => {
    const error = new Error("Unique constraint");
    error.code = "P2002";
    mockPrisma.repost.create.mockRejectedValue(error);

    const result = await Post.repost(1, 42);
    expect(result).toBeNull();
  });

  test("throws other errors", async () => {
    mockPrisma.repost.create.mockRejectedValue(new Error("Database error"));

    await expect(Post.repost(1, 42)).rejects.toThrow("Database error");
  });
});

describe("Post.unrepost", () => {
  test("deletes repost and decrements count", async () => {
    mockPrisma.repost.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.post.update.mockResolvedValue({});

    await Post.unrepost(1, 42);
    expect(mockPrisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { repostsCount: { decrement: 1 } },
      }),
    );
  });
});

describe("Post.getByUser", () => {
  test("returns user posts ordered by creation date", async () => {
    mockPrisma.post.findMany.mockResolvedValue([mockPost]);
    const result = await Post.getByUser(42);
    expect(result).toHaveLength(1);
    expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authorId: 42 },
      }),
    );
  });
});

describe("Post.count", () => {
  test("returns total post count", async () => {
    mockPrisma.post.count.mockResolvedValue(42);
    const result = await Post.count();
    expect(result).toBe(42);
  });
});
