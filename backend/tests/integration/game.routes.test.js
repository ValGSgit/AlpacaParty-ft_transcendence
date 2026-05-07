/**
 * Game Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  game: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  gameStat: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  alpacaFarm: { findUnique: jest.fn(), upsert: jest.fn() },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
  dailyChallenge: { findMany: jest.fn() },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule("#config/prisma.js", () => ({ default: mockPrisma }));

const { createTestApp } = await import("../helpers/createApp.js");
const { default: AuthService } =
  await import("../../src/services/authService.js");

let app;
let request;
let token;

const authUser = {
  id: 1,
  username: "gamer",
  email: "g@test.com",
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fnOrOps) =>
    typeof fnOrOps === "function" ? fnOrOps(mockPrisma) : Promise.all(fnOrOps),
  );
  app = await createTestApp();
  request = supertest(app);
  token = AuthService.generateAccessToken({
    id: 1,
    username: "gamer",
  });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set("Cookie", [`jwt_token=${token}`]);
}

// ── GET /api/game/stats ───────────────────────────────────────
describe("GET /api/game/stats", () => {
  test("401 — requires auth", async () => {
    const res = await request.get("/api/game/stats");
    expect(res.status).toBe(401);
  });

  test("200 — returns stats", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.gameStat.findUnique.mockResolvedValueOnce({
      userId: 1,
      gameType: "spit_royale",
      wins: 5,
      losses: 2,
      draws: 0,
      elo: 1050,
    });
    const res = await request
      .get("/api/game/stats")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
  });

  test("200 — with gameType query param", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.gameStat.findUnique.mockResolvedValueOnce({
      userId: 1,
      gameType: "spit_royale",
      wins: 5,
      losses: 2,
      draws: 0,
      elo: 1050,
    });
    const res = await request
      .get("/api/game/stats?gameType=spit_royale")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/game/history ─────────────────────────────────────
describe("GET /api/game/history", () => {
  test("200 — returns match history", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.game.findMany.mockResolvedValueOnce([
      {
        id: 1,
        player1Id: 1,
        player2Id: 2,
        status: "finished",
        gameType: "spit_royale",
        player1Score: 5,
        player2Score: 3,
      },
    ]);
    const res = await request
      .get("/api/game/history")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });
});

// ── GET /api/game/leaderboard ─────────────────────────────────
describe("GET /api/game/leaderboard", () => {
  test("200 — returns leaderboard", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.gameStat.findMany.mockResolvedValueOnce([
      {
        userId: 2,
        gameType: "spit_royale",
        elo: 1200,
        wins: 10,
        losses: 2,
        draws: 0,
        user: { username: "top", avatar: null, level: 5 },
      },
    ]);
    const res = await request
      .get("/api/game/leaderboard")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(1);
  });
});

// ── GET /api/game/farm ────────────────────────────────────────
describe("GET /api/game/farm", () => {
  test("200 — returns farm data", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.alpacaFarm.upsert.mockResolvedValueOnce({
      userId: 1,
      farmData: { coins: 100, alpacas: [] },
    });
    const res = await request
      .get("/api/game/farm")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("farm");
  });
});

// ── PUT /api/game/farm ────────────────────────────────────────
describe("PUT /api/game/farm", () => {
  test("400 — missing farmData", async () => {
    const res = await auth(request.put("/api/game/farm")).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/farmData/i);
  });

  test("200 — saves farm", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    const farmData = { coins: 200, alpacas: [] };
    mockPrisma.alpacaFarm.upsert.mockResolvedValueOnce({ userId: 1, farmData });
    const res = await request
      .put("/api/game/farm")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ farmData });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("farm");
  });
});

// ── GET /api/game/achievements ────────────────────────────────
describe("GET /api/game/achievements", () => {
  test("200 — returns all achievements with unlock status", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // auth
    mockPrisma.achievement.findMany.mockResolvedValueOnce([
      { id: 1, key: "first_win", title: "First Win" },
    ]); // getAll
    mockPrisma.userAchievement.findMany.mockResolvedValueOnce([
      {
        achievementId: 1,
        achievement: { key: "first_win", title: "First Win" },
        unlockedAt: new Date(),
      },
    ]); // getUserAchievements
    const res = await request
      .get("/api/game/achievements")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.achievements[0]).toHaveProperty("unlocked", true);
  });
});

// ── GET /api/game/challenges ──────────────────────────────────
describe("GET /api/game/challenges", () => {
  test("200 — returns challenges", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.dailyChallenge.findMany.mockResolvedValueOnce([
      {
        id: 1,
        key: "win_10",
        title: "Win 10",
        target: 10,
        userChallenges: [{ completed: false, completedAt: null }],
      },
    ]);
    const res = await request
      .get("/api/game/challenges")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("challenges");
  });
});
