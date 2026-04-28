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
      .set("Cookie", [`jwt_token=${validUser.token}`]);
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
      .set("Cookie", [`jwt_token=${validUser.token}`]);
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
      .set("Cookie", [`jwt_token=${validUser.token}`]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(res.body.count).toBe(1);
  });
});

