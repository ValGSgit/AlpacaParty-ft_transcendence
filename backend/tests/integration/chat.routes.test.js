/**
 * Chat Routes Integration Tests
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
import { createTestUsers } from "../helpers/createTestUsers.js";
import Message from "#models/Message.js";
import ChatRoom from "#models/ChatRoom.js";

let app;
let request;
let users;
let validUser;
let chatRoom1;
let chatRoom2;

// #region Setup

beforeAll(async () => {
  await setupUsers();
  await setupMessages();
  await setupChatRooms();
});

async function setupUsers() {
  await prisma.user.deleteMany({});
  users = await createTestUsers(10);

  const user = {
    id: users[1].id,
    username: users[1].username,
  };

  const validToken = AuthService.generateAccessToken({
    id: user.id,
    username: user.username,
    is_admin: false,
  });

  validUser = user;
  validUser.token = validToken;
}

async function setupMessages() {
  await prisma.message.deleteMany({});
  for (let i = 1; i < users.length - 1; i++) {
    await Message.create({
      senderId: users[i].id,
      receiverId: users[i - 1].id,
      content: `Hello to user ${users[i - 1].username}`,
    });
    await Message.create({
      senderId: users[i].id,
      receiverId: users[i + 1].id,
      content: `Hello to user ${users[i + 1].username}`,
    });
  }
}

async function setupChatRooms() {
  await prisma.chatRoom.deleteMany({});
  await prisma.chatRoomMember.deleteMany({});
  await prisma.chatRoomMessage.deleteMany({});
  chatRoom1 = await ChatRoom.create({
    name: "TestChatRoom1",
    ownerId: validUser.id,
    isPrivate: false,
  });
  chatRoom2 = await ChatRoom.create({
    name: "TestChatRoom2",
    ownerId: users[0].id,
    isPrivate: false,
  });

  await ChatRoom.sendMessage({
    roomId: chatRoom1.id,
    senderId: validUser.id,
    content: "First message in this room",
  });

  await ChatRoom.sendMessage({
    roomId: chatRoom1.id,
    senderId: validUser.id,
    content: "Second message in this room",
  });

  await ChatRoom.addMember(chatRoom1.id, validUser.id); // users[1]
  await ChatRoom.addMember(chatRoom1.id, users[0].id);
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

describe("GET /api/chat/conversations", () => {
  test("401 — requires auth", async () => {
    const res = await request.get("/api/chat/conversations");
    expect(res.status).toBe(401);
  });

  test("200 — returns conversations", async () => {
    const res = await request
      .get("/api/chat/conversations")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("conversations");
    expect(res.body.conversations.length).toBe(2);
    expect(res.body.conversations[0].last_message).toMatch(/Hello to/i);
  });
});

describe("GET /api/chat/dm/:userId", () => {
  test("200 — returns conversation messages", async () => {
    const res = await request
      .get(`/api/chat/dm/${validUser.id + 1}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /api/chat/unread", () => {
  beforeAll(async () => {
    const msg = {
      senderId: validUser.id + 1,
      receiverId: validUser.id,
      content: "unread message",
    };
    await Message.create(msg);
  });

  test("200 — returns unread count", async () => {
    const res = await request
      .get("/api/chat/unread")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(res.body.count).toBe(1);
  });
});

// ── GET /api/chat/rooms ───────────────────────────────────────
describe("GET /api/chat/rooms", () => {
  test("200 — returns user rooms", async () => {
    const res = await request
      .get("/api/chat/rooms")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.rooms).toHaveLength(1);
  });
});

describe("POST /api/chat/rooms", () => {
  test("400 — missing room name", async () => {
    const res = await request
      .post("/api/chat/rooms")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/room name/i);
  });

  test("400 — empty room name", async () => {
    const res = await request
      .post("/api/chat/rooms")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/room name/i);
  });

  test("201 — creates room", async () => {
    const res = await request
      .post("/api/chat/rooms")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ name: "General" });

    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe("General");
  });
});

describe("GET /api/chat/rooms/:id/messages", () => {
  beforeAll(async () => {});

  test("403 — not a member", async () => {
    const res = await request
      .get(`/api/chat/rooms/${chatRoom2.id}/messages`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/not a member/i);
  });

  test("200 — returns room messages for member", async () => {
    const res = await request
      .get(`/api/chat/rooms/${chatRoom1.id}/messages`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].content).toMatch(/message/i);
    expect(res.body.messages[1].content).toMatch(/message/i);
  });
});

describe("POST /api/chat/rooms/:id/members", () => {
  test("400 — missing userId", async () => {
    const res = await request
      .post("/api/chat/rooms/10/members")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("404 — room not found", async () => {
    const res = await request
      .post("/api/chat/rooms/999/members")
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: 2 });
    expect(res.status).toBe(404);
  });

  test("201 — adds member", async () => {
    const res = await request
      .post(`/api/chat/rooms/${chatRoom1.id}/members`)
      .set("Authorization", `Bearer ${validUser.token}`)
      .send({ userId: users[5].id });
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/chat/rooms/:id/members/:userId", () => {
  test("200 — removes member", async () => {
    const res = await request
      .delete(`/api/chat/rooms/${chatRoom1.id}/members/${users[5].id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });
});

describe("DELETE /api/chat/rooms/:id", () => {
  test("404 — room not found", async () => {
    const res = await request
      .delete(`/api/chat/rooms/999`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(404);
  });

  test("403 — not the owner", async () => {
    const res = await request
      .delete(`/api/chat/rooms/${chatRoom2.id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/not/i);
    expect(res.body.error.message).toMatch(/owner/i);
  });

  test("200 — deletes room", async () => {
    const res = await request
      .delete(`/api/chat/rooms/${chatRoom1.id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// #endregion
