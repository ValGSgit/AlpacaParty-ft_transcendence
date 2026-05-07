import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPost = {
  getFeed: jest.fn(),
  getByUser: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  like: jest.fn(),
  unlike: jest.fn(),
  count: jest.fn(),
};
jest.unstable_mockModule("../../../src/models/Post.js", () => ({
  default: mockPost,
}));

const mockNotificationService = {
  postLiked: jest.fn().mockResolvedValue(true),
};
jest.unstable_mockModule(
  "../../../src/services/notificationService.js",
  () => ({
    default: mockNotificationService,
  }),
);

const {
  getFeed,
  getUserPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} = await import("../../../src/controllers/postController.js");

// ── Helpers ──────────────────────────────────────────────────────────────────
function createReqRes(overrides = {}) {
  const req = {
    user: { id: 1, username: "alice" },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
  const res = {
    _status: 200,
    _json: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._json = body;
      return res;
    },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => {
  Object.values(mockPost).forEach((fn) => fn.mockReset());
  mockNotificationService.postLiked.mockReset().mockResolvedValue(true);
});

// ── getFeed ──────────────────────────────────────────────────────────────────
describe("getFeed", () => {
  test("should return posts array", async () => {
    const posts = [{ id: 1, content: "hello" }];
    mockPost.getFeed.mockResolvedValue(posts);

    const { req, res, next } = createReqRes();
    await getFeed(req, res, next);

    expect(mockPost.getFeed).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      viewerId: 1,
    });
    expect(res._json).toEqual({ posts });
  });

  test("should respect limit and offset query params", async () => {
    mockPost.getFeed.mockResolvedValue([]);

    const { req, res, next } = createReqRes({
      query: { limit: "5", offset: "10" },
    });
    await getFeed(req, res, next);

    expect(mockPost.getFeed).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
      viewerId: 1,
    });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.getFeed.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await getFeed(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── getUserPosts ─────────────────────────────────────────────────────────────
describe("getUserPosts", () => {
  test("should return posts for a user", async () => {
    const posts = [{ id: 1, content: "post1" }];
    mockPost.getByUser.mockResolvedValue(posts);

    const { req, res, next } = createReqRes({ params: { userId: "42" } });
    await getUserPosts(req, res, next);

    expect(mockPost.getByUser).toHaveBeenCalledWith(42, {
      limit: 20,
      offset: 0,
    });
    expect(res._json).toEqual({ posts });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.getByUser.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { userId: "42" } });
    await getUserPosts(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── createPost ───────────────────────────────────────────────────────────────
describe("createPost", () => {
  test("should reject when content is missing", async () => {
    const { req, res, next } = createReqRes({ body: {} });
    await createPost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: "content is required" } });
  });

  test("should reject when content is empty string", async () => {
    const { req, res, next } = createReqRes({ body: { content: "   " } });
    await createPost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: "content is required" } });
  });

  test("should reject when content exceeds 5000 characters", async () => {
    const { req, res, next } = createReqRes({
      body: { content: "a".repeat(5001) },
    });
    await createPost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      error: { message: "content must be 5000 characters or fewer" },
    });
  });

  test("should reject invalid imageUrl", async () => {
    const { req, res, next } = createReqRes({
      body: { content: "hello", imageUrl: 123 },
    });
    await createPost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: "invalid imageUrl" } });
  });

  test("should reject imageUrl exceeding 2048 characters", async () => {
    const { req, res, next } = createReqRes({
      body: { content: "hello", imageUrl: "http://" + "a".repeat(2048) },
    });
    await createPost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: "invalid imageUrl" } });
  });

  test("should create post successfully", async () => {
    const post = { id: 1, content: "hello", authorId: 1 };
    mockPost.create.mockResolvedValue(post);

    const { req, res, next } = createReqRes({ body: { content: "hello" } });
    await createPost(req, res, next);

    expect(mockPost.create).toHaveBeenCalledWith({
      authorId: 1,
      content: "hello",
      imageUrl: null,
      isPublic: true,
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ post });
  });

  test("should normalize image_url to imageUrl", async () => {
    mockPost.create.mockResolvedValue({ id: 1 });

    const { req, res, next } = createReqRes({
      body: { content: "hello", image_url: "http://img.com/pic.png" },
    });
    await createPost(req, res, next);

    expect(mockPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: "http://img.com/pic.png" }),
    );
  });

  test("should trim content", async () => {
    mockPost.create.mockResolvedValue({ id: 1 });

    const { req, res, next } = createReqRes({ body: { content: "  hello  " } });
    await createPost(req, res, next);

    expect(mockPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello" }),
    );
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.create.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ body: { content: "hello" } });
    await createPost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── getPost ──────────────────────────────────────────────────────────────────
describe("getPost", () => {
  test("should return post", async () => {
    const post = { id: 10, content: "test" };
    mockPost.findById.mockResolvedValue(post);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await getPost(req, res, next);

    expect(res._json).toEqual({ post });
  });

  test("should return 404 for missing post", async () => {
    mockPost.findById.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: "999" } });
    await getPost(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: "Post not found" } });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.findById.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await getPost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── updatePost ───────────────────────────────────────────────────────────────
describe("updatePost", () => {
  test("should reject empty content", async () => {
    const { req, res, next } = createReqRes({
      params: { id: "1" },
      body: { content: "" },
    });
    await updatePost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      error: { message: "content must be between 1 and 5000 characters" },
    });
  });

  test("should reject content over 5000 characters", async () => {
    const { req, res, next } = createReqRes({
      params: { id: "1" },
      body: { content: "a".repeat(5001) },
    });
    await updatePost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      error: { message: "content must be between 1 and 5000 characters" },
    });
  });

  test("should reject invalid imageUrl", async () => {
    const { req, res, next } = createReqRes({
      params: { id: "1" },
      body: { imageUrl: 42 },
    });
    await updatePost(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: { message: "invalid imageUrl" } });
  });

  test("should update post successfully", async () => {
    const post = { id: 1, content: "updated" };
    mockPost.update.mockResolvedValue(post);

    const { req, res, next } = createReqRes({
      params: { id: "1" },
      body: { content: "updated" },
    });
    await updatePost(req, res, next);

    expect(mockPost.update).toHaveBeenCalled();
    expect(res._json).toEqual({ post });
  });

  test("should return 404 if post not found or not owned", async () => {
    mockPost.update.mockResolvedValue(null);

    const { req, res, next } = createReqRes({
      params: { id: "999" },
      body: { content: "updated" },
    });
    await updatePost(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({
      error: { message: "Post not found or not yours" },
    });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.update.mockRejectedValue(error);

    const { req, res, next } = createReqRes({
      params: { id: "1" },
      body: { content: "x" },
    });
    await updatePost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── deletePost ───────────────────────────────────────────────────────────────
describe("deletePost", () => {
  test("should delete post successfully", async () => {
    mockPost.delete.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: "1" } });
    await deletePost(req, res, next);

    expect(mockPost.delete).toHaveBeenCalledWith(1, 1);
    expect(res._json).toEqual({ message: "Post deleted" });
  });

  test("should return 404 if not found and user is not admin", async () => {
    mockPost.delete.mockResolvedValue(false);

    const { req, res, next } = createReqRes({ params: { id: "999" } });
    await deletePost(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({
      error: { message: "Post not found or not yours" },
    });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.delete.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: "1" } });
    await deletePost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── likePost ─────────────────────────────────────────────────────────────────
describe("likePost", () => {
  test("should like a post successfully", async () => {
    mockPost.findById.mockResolvedValue({ id: 10, author_id: 2 });
    mockPost.like.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await likePost(req, res, next);

    expect(mockPost.like).toHaveBeenCalledWith(10, 1);
    expect(res._json).toEqual({ message: "Liked" });
  });

  test("should send notification if liking someone elses post", async () => {
    mockPost.findById.mockResolvedValue({ id: 10, author_id: 5 });
    mockPost.like.mockResolvedValue(true);

    const { req, res, next } = createReqRes({
      params: { id: "10" },
      user: { id: 1, username: "alice" },
    });
    await likePost(req, res, next);

    expect(mockNotificationService.postLiked).toHaveBeenCalledWith(
      5,
      "alice",
      10,
    );
  });

  test("should not send notification if liking own post", async () => {
    mockPost.findById.mockResolvedValue({ id: 10, author_id: 1 });
    mockPost.like.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await likePost(req, res, next);

    expect(mockNotificationService.postLiked).not.toHaveBeenCalled();
  });

  test("should return 404 if post not found", async () => {
    mockPost.findById.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: "999" } });
    await likePost(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: "Post not found" } });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.findById.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await likePost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── unlikePost ───────────────────────────────────────────────────────────────
describe("unlikePost", () => {
  test("should unlike a post", async () => {
    mockPost.unlike.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await unlikePost(req, res, next);

    expect(mockPost.unlike).toHaveBeenCalledWith(10, 1);
    expect(res._json).toEqual({ message: "Unliked" });
  });

  test("should call next on error", async () => {
    const error = new Error("fail");
    mockPost.unlike.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: "10" } });
    await unlikePost(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
