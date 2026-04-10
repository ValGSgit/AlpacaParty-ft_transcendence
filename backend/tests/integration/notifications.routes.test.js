/**
 * Notifications Routes Integration Tests
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
import Notification from "#models/Notification.js";

let app;
let request;
let users;
let validUser;
let nots = [];

// #region Setup

beforeAll(async () => {
  await setupUsers();
  await setupNotifications();
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

async function setupNotifications() {
  await prisma.notification.deleteMany({});

  {
    const n = await Notification.create({
      userId: validUser.id,
      type: "type1",
      title: "Notfication1 title",
      message: "Notification1 message",
    });
    nots.push(n);
  }
  {
    const n = await Notification.create({
      userId: validUser.id,
      type: "type2",
      title: "Notfication2 title",
      message: "Notification2 message",
    });
    nots.push(n);
  }
  {
    const n = await Notification.create({
      userId: validUser.id,
      type: "type3",
      title: "Notfication3 title",
      message: "Notification3 message",
    });
    nots.push(n);
  }
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
describe("GET /api/notifications", () => {
  test("401 — requires auth", async () => {
    const res = await request.get("/api/notifications");
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/auth/i);
    expect(res.body.error.message).toMatch(/required/i);
  });

  test("200 — returns notifications and unread count", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("notifications");
    expect(res.body).toHaveProperty("unreadCount");
    expect(res.body.unreadCount).toBe(3);
  });

  test("200 — with unreadOnly filter", async () => {
    const res = await request
      .get("/api/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("notifications");
    expect(res.body.notifications).toHaveLength(3);
  });
});

describe("PUT /api/notifications/:id/read", () => {
  test("404 — notification not found", async () => {
    const res = await request
      .put("/api/notifications/999/read")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(404);
  });

  test("200 — marks notification as read", async () => {
    const res = await request
      .put(`/api/notifications/${nots[0].id}/read`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.notification.is_read).toBe(true);
  });
});

describe("PUT /api/notifications/read-all", () => {
  test("200 — marks all as read", async () => {
    //check before
    {
      const res = await request
        .get("/api/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${validUser.token}`);
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(2);
      expect(res.body.notifications[0].is_read).toBe(false);
      expect(res.body.notifications[1].is_read).toBe(false);
    }

    //read messages
    {
      const res = await request
        .put("/api/notifications/read-all")
        .set("Authorization", `Bearer ${validUser.token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/read/i);
    }

    //unread count should be 0 now
    {
      const res = await request
        .get("/api/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${validUser.token}`);
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(0);
      expect(res.body.notifications.length).toBe(0);
    }
  });
});

describe("DELETE /api/notifications/:id", () => {
  test("404 — notification not found", async () => {
    const res = await request
      .delete("/api/notifications/999")
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(404);
  });

  test("200 — deletes notification", async () => {
    const res = await request
      .delete(`/api/notifications/${nots[0].id}`)
      .set("Authorization", `Bearer ${validUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// #endregion
