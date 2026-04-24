/**
 * Public API Routes Integration Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "@jest/globals";
import supertest from "supertest";
import prisma from "#config/prisma.js";
import AuthService from "#services/authService.js";
import { createTestApp } from "../helpers/createApp.js";
import { createTestUser } from "../helpers/createTestUser.js";
import User from "#models/User.js";
import { createTestUsers } from "../helpers/createTestUsers.js";

let app;
let request;
let user;

beforeAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.userAuth.deleteMany({});
  user = await createTestUser("TestUser");
  user.apiKey = AuthService.generatePublicApiToken({ id: user.id });
  await User.setApiKey(user.id, user.apiKey);
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === "function" ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);

  await User.setApiKey(user.id, user.apiKey);
});

afterAll(async () => {
  // Disconnect Prisma so Jest can exit properly
  await prisma.$disconnect();
});

describe("GET /api/public", () => {
  test("200 — docs endpoint is publicly accessible without API key", async () => {
    const res = await request.get("/api/public");
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Public API/i);
  });

  test("200 — valid API key also returns docs", async () => {
    const res = await request
      .get("/api/public")
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Public API/i);
  });
});

describe("api key authentication", () => {
  test("401 — no api key", async () => {
    const res = await request.get("/api/public/users");
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/no api key/i);
  });

  test("401 — wrong api key", async () => {
    const res = await request
      .get("/api/public/users")
      .set("X-API-Key", `${user.apiKey}_wong_key`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid/i);
  });

  test("401 — wrong api key", async () => {
    await User.revokeApiKey(user.id);
    const res = await request
      .get("/api/public/users")
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/revoked/i);
  });
});

describe("GET /api/public/users", () => {
  beforeAll(async () => {
    await createTestUsers(50);
  });

  test("200 — list users", async () => {
    const res = await request
      .get("/api/public/users")
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(20);
  });

  test("200 — list users with valid limit", async () => {
    const res = await request
      .get("/api/public/users?limit=10")
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(10);
  });

  test("200 — list users with filter", async () => {
    const res = await request
      .get(`/api/public/users?search=${user.username}`)
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe(user.username);
  });

  test("400 — list users with invalid limit", async () => {
    const res = await request
      .get("/api/public/users?limit=200")
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit must be between/i);
  });

  test("200 — list users with valid offset", async () => {
    let res = await request
      .get(`/api/public/users?limit=2&offset=2`)
      .set("X-API-Key", `${user.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    const user1 = res.body.users[0];

    res = await request
      .get(`/api/public/users?limit=2&offset=4`)
      .set("X-API-Key", `${user.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    const user2 = res.body.users[0];

    // user1 id is bigger because result is sorted by createdAt
    // its the latest entered user in the database
    expect(user1.id).toBe(user2.id + 2);
  });
});

describe("GET /api/public/users:id", () => {
  test("200 — get user by id", async () => {
    const res = await request
      .get(`/api/public/users/${user.id}`)
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(user.username);
  });

  test("400 — invalid id", async () => {
    const res = await request
      .get(`/api/public/users/-1`)
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/must be a positive/i);
  });

  test("404 — invalid user id", async () => {
    const res = await request
      .get(`/api/public/users/999`)
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });
});

describe("GET /api/public/users", () => {
  test("200 — only public users and no email leakage", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 1,
        username: "public-user",
        isPublic: true,
        avatar: "/a.png",
        bio: "bio",
        status: "s",
        level: 1,
        xp: 2,
        isOnline: false,
        createdAt: "2026-01-01",
      },
      {
        id: 2,
        username: "private-user",
        isPublic: false,
        avatar: "/b.png",
        bio: "bio",
        status: "s",
        level: 1,
        xp: 2,
        isOnline: false,
        createdAt: "2026-01-01",
      },
    ]);

    const res = await request
      .get("/api/public/users")
      .set("X-API-Key", "test-api-key");

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe("public-user");
    expect(res.body.users[0].email).toBeUndefined();
  });
});

// ── POST /api/public/posts ────────────────────────────────────
describe("POST /api/public/posts", () => {
  test("401 — requires API key", async () => {
    const res = await request
      .post("/api/public/posts")
      .send({ content: "test", authorId: 1 });
    expect(res.status).toBe(401);
  });

  test("400 — requires content", async () => {
    const res = await request
      .post("/api/public/posts")
      .set("X-API-Key", "test-api-key")
      .send({ authorId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/invalid value|content/i);
  });

  test("400 — requires authorId", async () => {
    const res = await request
      .post("/api/public/posts")
      .set("X-API-Key", "test-api-key")
      .send({ content: "hello" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/authorId/i);
  });
});

// ── PUT /api/public/posts/:id ─────────────────────────────────
describe("PUT /api/public/posts/:id", () => {
  test("401 — requires API key", async () => {
    const res = await request
      .put("/api/public/posts/1")
      .send({ content: "updated" });
    expect(res.status).toBe(401);
  });

  test("400 — requires at least one field to update", async () => {
    const res = await request
      .put("/api/public/posts/1")
      .set("X-API-Key", "test-api-key")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/nothing to update/i);
  });
});

// ── DELETE /api/public/posts/:id ──────────────────────────────
describe("DELETE /api/public/posts/:id", () => {
  test("401 — requires API key", async () => {
    const res = await request.delete("/api/public/posts/1");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/public/mock", () => {
  test("200 — returns anonymized mock dataset with disclaimer", async () => {
    // User.findAll → prisma.user.findMany
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 1,
        username: "alice",
        isPublic: true,
        avatar: "/a.png",
        bio: "",
        status: "",
        level: 2,
        xp: 10,
        isOnline: false,
        createdAt: "2026-01-01",
      },
    ]);
    // Game.getLeaderboard → prisma.gameStat.findMany
    mockPrisma.gameStat.findMany.mockResolvedValueOnce([
      {
        userId: 1,
        gameType: "spit_royale",
        elo: 1000,
        wins: 1,
        losses: 0,
        draws: 0,
        user: { username: "alice", avatar: "/a.png", level: 2 },
      },
    ]);
    // Post.getFeed → prisma.post.findMany (postLike not called since viewerId=null)
    mockPrisma.post.findMany.mockResolvedValueOnce([
      {
        id: 10,
        authorId: 1,
        content: "secret",
        imageUrl: null,
        isPublic: true,
        likesCount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        author: { username: "alice", avatar: "/a.png" },
      },
    ]);
    mockPrisma.repost.findMany.mockResolvedValueOnce([]); // recent reposts

    const res = await request
      .get("/api/public/mock")
      .set("X-API-Key", "test-api-key");

    expect(res.status).toBe(200);
    expect(res.body.disclaimer).toMatch(/not user personal data/i);
    expect(res.body.users[0].username).toMatch(/^user_/);
    expect(res.body.posts[0].content).toMatch(/anonymized/i);
  });
});
