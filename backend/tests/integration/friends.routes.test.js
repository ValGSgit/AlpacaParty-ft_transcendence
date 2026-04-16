/**
 * Friends Routes Integration Tests
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
import Friend from "#models/Friend.js";

let app;
let request;
let validUser;
let friendOffline;
let friendOnline;
let friendBlocked;
let friendRequest;

// #region Setup

beforeAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.friend.deleteMany({});
  await prisma.friendRequest.deleteMany({});

  await setupUsers();
  await setupFriends();
});

async function setupUsers() {
  validUser = await createTestUser("ValidUser");
  const validToken = AuthService.generateAccessToken({
    id: validUser.id,
    username: validUser.username,
    is_admin: false,
  });
  validUser.token = validToken;

  friendOffline = await createTestUser("friendOffline");
  friendOnline = await createTestUser("friendOnline", { isOnline: true });
  friendBlocked = await createTestUser("friendBlocked");
  friendRequest = await createTestUser("friendRequest");
}

async function setupFriends() {
  await prisma.friend.createMany({
    data: [
      { userId: validUser.id, friendId: friendOffline.id },
      { userId: friendOffline.id, friendId: validUser.id },
    ],
    skipDuplicates: true,
  });

  await prisma.friend.createMany({
    data: [
      { userId: validUser.id, friendId: friendOnline.id },
      { userId: friendOnline.id, friendId: validUser.id },
    ],
    skipDuplicates: true,
  });
}

beforeEach(async () => {
  app = await createTestApp();
  request = supertest(app);
});

afterAll(async () => {
  // Disconnect Prisma so Jest can exit properly
  await prisma.$disconnect();
});

// #endregion

// #region Tests

describe("GET /api/friends", () => {
  test("200 — returns friends list", async () => {
    const res = await request
      .get("/api/friends")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("friends");
    expect(res.body.friends.length).toBe(2);
  });

  test("401 — requires auth", async () => {
    const res = await request.get("/api/friends");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/friends/online", () => {
  test("200 — returns online friends", async () => {
    const res = await request
      .get("/api/friends/online")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
  });
});

describe("GET /api/friends/blocked", () => {
  beforeAll(async () => {
    await Friend.blockUser(validUser.id, friendBlocked.id);
  });

  test("200 — returns blocked list", async () => {
    const res = await request
      .get("/api/friends/blocked")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("blocked");
    expect(res.body.blocked).toHaveLength(1);
  });
});

describe("GET /api/friends/requests", () => {
  beforeAll(async () => {
    await Friend.sendRequest(friendRequest.id, validUser.id);
  });

  test("200 — returns received and sent requests", async () => {
    const res = await request
      .get("/api/friends/requests")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("received");
    expect(res.body).toHaveProperty("sent");
    expect(res.body.received).toHaveLength(1);
  });
});

describe("POST /api/friends/requests", () => {
  test("400 — missing userId", async () => {
    const res = await request
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("userId");
  });

  test("400 — cannot friend yourself", async () => {
    const res = await request
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: validUser.id });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/yourself/i);
  });

  test("404 — target user not found", async () => {
    const res = await request
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: 999999 });
    expect(res.status).toBe(404);
  });

  test("201 — sends friend request", async () => {
    const res = await request
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: friendRequest.id });
    expect(res.status).toBe(201);
    expect(res.body.request).toHaveProperty("senderId", validUser.id);
  });
});

describe("PUT /api/friends/requests/:id/accept", () => {
  let friendRequestDbEntry;
  beforeAll(async () => {
    friendRequestDbEntry = await Friend.sendRequest(
      friendRequest.id,
      validUser.id,
    );
  });

  test("404 — request not found", async () => {
    const res = await request
      .put("/api/friends/requests/999/accept")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(404);
  });

  test("200 — accepts friend request", async () => {
    const res = await request
      .put(`/api/friends/requests/${friendRequestDbEntry.id}/accept`)
      .set("Authorization", `Bearer ${validUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("accepted");
  });
});

describe("PUT /api/friends/requests/:id/decline", () => {
  let friendRequestDbEntry;
  beforeAll(async () => {
    friendRequestDbEntry = await Friend.sendRequest(
      friendRequest.id,
      validUser.id,
    );
  });

  test("404 — request not found", async () => {
    const res = await request
      .put("/api/friends/requests/999/decline")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(404);
  });

  test("200 — declines friend request", async () => {
    const res = await request
      .put(`/api/friends/requests/${friendRequestDbEntry.id}/decline`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("declined");
  });
});

describe("DELETE /api/friends/:id", () => {
  test("200 — removes friend", async () => {
    let res = await request
      .get("/api/friends")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.friends.length).toBe(3);

    res = await request
      .delete(`/api/friends/${friendOffline.id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);

    res = await request
      .get("/api/friends")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.friends.length).toBe(2);
  });
});

describe("POST /api/friends/block", () => {
  test("400 — missing userId", async () => {
    const res = await request
      .post("/api/friends/block")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("200 — blocks user", async () => {
    const res = await request
      .post("/api/friends/block")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: friendOffline.id });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/blocked/i);
  });
});

describe("DELETE /api/friends/block/:id", () => {
  test("200 — unblocks user", async () => {
    const res = await request
      .delete(`/api/friends/block/${friendOffline.id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unblocked/i);
  });
});

// TODO
// describe("friend request from both sides", () => {
//   let user1;
//   let user2;
//   beforeAll(async () => {
//     user1 = await createTestUser("userTestRequest1");
//     user2 = await createTestUser("userTestRequest2");

//     let token = AuthService.generateAccessToken({
//       id: user1.id,
//       username: user1.username,
//     });
//     user1.token = token;

//     token = AuthService.generateAccessToken({
//       id: user2.id,
//       username: user2.username,
//     });
//     user2.token = token;
//   });

//   test("201 — user1 sends friend request", async () => {
//     const res = await request
//       .post("/api/friends/requests")
//       .set("Authorization", `Bearer ${user1.token}`)
//       .send({ userId: user2.id });
//     expect(res.status).toBe(201);
//     expect(res.body.request).toHaveProperty("senderId", user1.id);
//   });

//   test("201 — user2 sends friend request", async () => {
//     const res = await request
//       .post("/api/friends/requests")
//       .set("Authorization", `Bearer ${user2.token}`)
//       .send({ userId: user1.id });
//     console.log(res.body);
//     expect(res.status).toBe(201);
//     expect(res.body.request).toHaveProperty("senderId", user2.id);
//   });

//   test("200 — should be friends now", async () => {
//     let res = await request
//       .get("/api/friends/requests")
//       .set("Authorization", `Bearer ${user1.token}`);
//     expect(res.status).toBe(200);
//     console.log(res.body);

//     res = await request
//       .get("/api/friends")
//       .set("Authorization", `Bearer ${user1.token}`);
//   });
// });

// #endregion
