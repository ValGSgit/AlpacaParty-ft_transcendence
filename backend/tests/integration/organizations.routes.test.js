/**
 * Organizations Routes Integration Tests
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";

// ── Mock prisma ──
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
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizationMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  achievement: { findUnique: jest.fn(), findMany: jest.fn() },
  userAchievement: { findMany: jest.fn(), create: jest.fn() },
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
  username: "orguser",
  email: "o@test.com",
  isAdmin: false,
  isPublic: true,
};
// Prisma camelCase org (with _count for findAll/search)
const sampleOrgPrisma = {
  id: 5,
  name: "AlpacaClub",
  description: "A club for alpacas",
  ownerId: 1,
  avatar: "/avatars/default-org.svg",
  _count: { members: 1 },
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
    username: "orguser",
    isAdmin: false,
  });
});

function auth(req) {
  mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
  return req.set("Cookie", [`jwt_token=${token}`]);
}

// ── GET /api/organizations ────────────────────────────────────
describe("GET /api/organizations", () => {
  test("401 — requires auth", async () => {
    const res = await request.get("/api/organizations");
    expect(res.status).toBe(401);
  });

  test("200 — returns organizations list", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Organization.findAll → organization.findMany (with _count)
    mockPrisma.organization.findMany.mockResolvedValueOnce([sampleOrgPrisma]);
    const res = await request
      .get("/api/organizations")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(1);
  });

  test("200 — filters by search query", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Organization.search → organization.findMany
    mockPrisma.organization.findMany.mockResolvedValueOnce([]);
    const res = await request
      .get("/api/organizations?search=alpaca")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(0);
  });
});

// ── GET /api/organizations/mine ───────────────────────────────
describe("GET /api/organizations/mine", () => {
  test("200 — returns user orgs", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Organization.getUserOrgs → organizationMember.findMany(include: { org: true })
    mockPrisma.organizationMember.findMany.mockResolvedValueOnce([
      {
        org: { id: 5, name: "AlpacaClub", description: "A club", ownerId: 1 },
        role: "owner",
      },
    ]);
    const res = await request
      .get("/api/organizations/mine")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(1);
  });
});

// ── GET /api/organizations/:id ────────────────────────────────
describe("GET /api/organizations/:id", () => {
  test("404 — not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organization.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .get("/api/organizations/999")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(404);
  });

  test("200 — returns organization", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organization.findUnique.mockResolvedValueOnce({
      id: 5,
      name: "AlpacaClub",
      ownerId: 1,
    });
    // getMembers → organizationMember.findMany
    mockPrisma.organizationMember.findMany.mockResolvedValueOnce([]);
    const res = await request
      .get("/api/organizations/5")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe("AlpacaClub");
  });
});

// ── POST /api/organizations ───────────────────────────────────
describe("POST /api/organizations", () => {
  test("400 — missing name", async () => {
    const res = await auth(request.post("/api/organizations")).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/name/i);
  });

  test("201 — creates organization", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser); // authenticate
    // Organization.create → $transaction(async tx => { organization.create, organizationMember.create })
    mockPrisma.organization.create.mockResolvedValueOnce({
      id: 5,
      name: "AlpacaClub",
      description: "A club for alpacas",
      ownerId: 1,
    });
    mockPrisma.organizationMember.create.mockResolvedValueOnce({});
    // checkOrgAchievements → tryUnlock('org_founder') → achievement.findUnique → null
    mockPrisma.achievement.findUnique.mockResolvedValueOnce(null);

    const res = await request
      .post("/api/organizations")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ name: "AlpacaClub", description: "A club for alpacas" });

    expect(res.status).toBe(201);
    expect(res.body.organization.name).toBe("AlpacaClub");
  });
});

// ── PUT /api/organizations/:id ────────────────────────────────
describe("PUT /api/organizations/:id", () => {
  test("403 — non-member cannot update", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Organization.isMember → organizationMember.findUnique → null
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .put("/api/organizations/999")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ name: "New Name" });
    expect(res.status).toBe(403);
  });

  test("403 — not owner or admin", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
      role: "member",
    });
    const res = await request
      .put("/api/organizations/5")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ name: "New Name" });
    expect(res.status).toBe(403);
  });

  test("200 — owner can update", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
      role: "owner",
    });
    mockPrisma.organization.update.mockResolvedValueOnce({
      id: 5,
      name: "Updated Club",
      ownerId: 1,
    });
    const res = await request
      .put("/api/organizations/5")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ name: "Updated Club" });
    expect(res.status).toBe(200);
  });
});

// ── DELETE /api/organizations/:id ────────────────────────────
describe("DELETE /api/organizations/:id", () => {
  test("404 — not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // Organization.findById → organization.findUnique → null
    mockPrisma.organization.findUnique.mockResolvedValueOnce(null);
    const res = await request
      .delete("/api/organizations/999")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(404);
  });

  test("403 — not the owner", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    // org.ownerId !== req.user.id (99 !== 1)
    mockPrisma.organization.findUnique.mockResolvedValueOnce({
      id: 5,
      name: "AlpacaClub",
      ownerId: 99,
    });
    const res = await request
      .delete("/api/organizations/5")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(403);
  });

  test("200 — owner can delete", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organization.findUnique.mockResolvedValueOnce({
      id: 5,
      name: "AlpacaClub",
      ownerId: 1,
    });
    mockPrisma.organization.delete.mockResolvedValueOnce({});
    const res = await request
      .delete("/api/organizations/5")
      .set("Cookie", [`jwt_token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ── POST /api/organizations/:id/members ──────────────────────
describe("POST /api/organizations/:id/members", () => {
  test("400 — missing userId", async () => {
    const res = await auth(request.post("/api/organizations/5/members")).send(
      {},
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/userId/i);
  });

  test("403 — non-owner cannot add members", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
      role: "member",
    });
    const res = await request
      .post("/api/organizations/5/members")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ userId: 3 });
    expect(res.status).toBe(403);
  });

  test("201 — owner can add members", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(authUser);
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
      role: "owner",
    });
    mockPrisma.organization.findUnique.mockResolvedValueOnce({
      id: 5,
      name: "AlpacaClub",
      ownerId: 1,
    });
    mockPrisma.organizationMember.upsert.mockResolvedValueOnce({});
    // NotificationService.orgInvite is fire-and-forget (.catch(() => {}))
    const res = await request
      .post("/api/organizations/5/members")
      .set("Cookie", [`jwt_token=${token}`])
      .send({ userId: 3 });
    expect(res.status).toBe(201);
  });
});
