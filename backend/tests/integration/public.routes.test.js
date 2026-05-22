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
import Post from "#models/Post.js";
import config from "#config/index.js";

let app;
let request;
let user;

beforeAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.userAuth.deleteMany({});
  await prisma.post.deleteMany({});
  user = await createTestUser("TestUser");
  user.apiKey = AuthService.generatePublicApiToken({ id: user.id });
  await User.setApiKey(user.id, user.apiKey);
});

beforeEach(async () => {
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
      .get(`/api/public/users?filter[username]=${user.username}`)
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
      .get(`/api/public/users?limit=2&offset=2&sort[createdAt]=desc`)
      .set("X-API-Key", `${user.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    const user1 = res.body.users[0];

    res = await request
      .get(`/api/public/users?limit=2&offset=4&sort[createdAt]=desc`)
      .set("X-API-Key", `${user.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    const user2 = res.body.users[0];

    // user1 id is bigger because result is sorted by createdAt
    // its the latest entered user in the database
    expect(user1.id).toBe(user2.id + 2);
  });

  test("200 — only public users and no email leakage", async () => {
    const res = await request
      .get("/api/public/users")
      .set("X-API-Key", `${user.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(20);
    expect(res.body.users[0].username).toMatch(/user/i);
    expect(res.body.users[0].email).toBeUndefined();
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
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/invalid value|content/i);
  });

  test("200 - create post", async () => {
    const res = await request
      .post("/api/public/posts")
      .set("X-API-Key", `${user.apiKey}`)
      .send({ content: "  hello  ", imageUrl: "www.google.com" });
    expect(res.status).toBe(201);
    expect(res.body.post).toBeDefined();
    expect(res.body.post.content).toBe("hello");
    expect(res.body.post.image_url).toBe("www.google.com");
  });
});

describe("PUT /api/public/posts/:id", () => {
  let post;
  beforeAll(async () => {
    post = await Post.create({ authorId: user.id, content: "content" });
  });

  test("401 — requires API key", async () => {
    const res = await request
      .put("/api/public/posts/1")
      .send({ content: "updated" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/no api key/i);
  });

  test("400 — requires at least one field to update", async () => {
    const res = await request
      .put("/api/public/posts/1")
      .set("X-API-Key", `${user.apiKey}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/content/i);
    expect(res.body.error.message).toMatch(/required/i);
  });

  test("400 — invalid id", async () => {
    const res = await request
      .put("/api/public/posts/-1")
      .set("X-API-Key", `${user.apiKey}`)
      .send({ content: "updated" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/id/i);
    expect(res.body.error.message).toMatch(/positive int/i);
  });

  test("200 — successfull update", async () => {
    const dbPost = await prisma.post.findFirst({ where: { id: post.id } });
    expect(dbPost.id).toBe(post.id);

    const res = await request
      .put(`/api/public/posts/${post.id}`)
      .set("X-API-Key", `${user.apiKey}`)
      .send({ content: "updated" });
    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe("updated");
  });
});

describe("DELETE /api/public/posts/:id", () => {
  let post;
  beforeAll(async () => {
    post = await Post.create({ authorId: user.id, content: "content" });
  });

  test("401 — requires API key", async () => {
    const res = await request.delete("/api/public/posts/1");
    expect(res.status).toBe(401);
  });

  test("200 — successfull delete", async () => {
    expect((await prisma.post.findFirst({ where: { id: post.id } })) != null);

    const res = await request
      .delete(`/api/public/posts/${post.id}`)
      .set("X-API-Key", `${user.apiKey}`);
    expect(res.status).toBe(200);
    expect((await prisma.post.findFirst({ where: { id: post.id } })) === null);
  });
});

describe("Public API Rate Limiting", () => {
  let user1;
  beforeAll(async () => {
    user1 = await createTestUser("TestUser1");
    user1.apiKey = AuthService.generatePublicApiToken({ id: user1.id });
    await User.setApiKey(user1.id, user1.apiKey);
  });

  test("should rate limit User A but allow User B to keep making requests", async () => {
    // Step 1: Use up all allowed requests for user1
    for (let i = 0; i < config.rateLimitPublicApi.max; i++) {
      const res = await request
        .get("/api/public/posts")
        .set("X-API-Key", `${user1.apiKey}`);
      expect(res.status).toBe(200);
    }

    // Step 2: The next request for user1 should be blocked (429 Too Many Requests)
    const blockedResponse = await request
      .get(`/api/public/posts`)
      .set("X-API-Key", `${user1.apiKey}`);

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error).toMatch(/rate limit exceeded/i);

    // Step 3: Make a request with another user.
    // This proves the limit works per user
    const userBResponse = await request
      .get(`/api/public/posts`)
      .set("X-API-Key", `${user.apiKey}`);

    expect(userBResponse.status).toBe(200);
  });
});
