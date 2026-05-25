import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import CustomError from "#utils/CustomError.js";

const mockConfig = {
  jwt: {
    cookieOptionsAdmin: {},
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  post: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuthService = {
  comparePassword: jest.fn(),
  generateAdminToken: jest.fn(),
  verifyAdminToken: jest.fn(),
};

const mockVault = {
  read: jest.fn(),
  write: jest.fn(),
};

jest.unstable_mockModule("#config/index.js", () => ({ default: mockConfig }));
jest.unstable_mockModule("#config/prisma.js", () => ({ default: mockPrisma }));
jest.unstable_mockModule("../../../src/services/authService.js", () => ({
  default: mockAuthService,
}));
jest.unstable_mockModule("../../../src/lib/vault.js", () => ({
  default: mockVault,
}));

const adminController =
  await import("../../../src/controllers/adminController.js");
const { default: prisma } = await import("#config/prisma.js");
const { default: AuthService } =
  await import("../../../src/services/authService.js");
const { default: Vault } = await import("../../../src/lib/vault.js");

describe("adminController", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      params: {},
      query: {},
      admin: { id: 1, username: "superadmin", role: "superadmin" },
    };
    res = {
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("adminLogin", () => {
    test("should throw error if username and password not provided", async () => {
      req.body = { username: "", password: "" };

      await adminController.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if user not found", async () => {
      req.body = { username: "nonexistent", password: "pass" };
      prisma.user.findUnique.mockResolvedValue(null);

      await adminController.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if password invalid", async () => {
      req.body = { username: "admin", password: "wrongpass" };
      const user = {
        id: 1,
        username: "admin",
        role: "admin",
        userAuth: { passwordHash: "hash" },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      AuthService.comparePassword.mockResolvedValue(false);

      await adminController.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if user role is not admin or superadmin", async () => {
      req.body = { username: "user", password: "pass" };
      const user = {
        id: 2,
        username: "user",
        role: "user",
        userAuth: { passwordHash: "hash" },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      AuthService.comparePassword.mockResolvedValue(true);

      await adminController.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if user is banned", async () => {
      req.body = { username: "admin", password: "pass" };
      const user = {
        id: 1,
        username: "admin",
        role: "admin",
        isBanned: true,
        userAuth: { passwordHash: "hash" },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      AuthService.comparePassword.mockResolvedValue(true);

      await adminController.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should create token and set cookie on successful login by username", async () => {
      req.body = { username: "admin", password: "pass" };
      const user = {
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
        isBanned: false,
        userAuth: { passwordHash: "hash" },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      AuthService.comparePassword.mockResolvedValue(true);
      AuthService.generateAdminToken.mockReturnValue("test-token");

      await adminController.adminLogin(req, res, next);

      expect(AuthService.generateAdminToken).toHaveBeenCalledWith(user);
      expect(res.cookie).toHaveBeenCalledWith(
        "admin_jwt_token",
        "test-token",
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({
        user: { id: 1, username: "admin", role: "admin" },
      });
    });

    test("should find user by email if username not found", async () => {
      req.body = { username: "admin@test.com", password: "pass" };
      const user = {
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
        isBanned: false,
        userAuth: { passwordHash: "hash" },
      };
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user);
      AuthService.comparePassword.mockResolvedValue(true);
      AuthService.generateAdminToken.mockReturnValue("test-token");

      await adminController.adminLogin(req, res, next);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        user: { id: 1, username: "admin", role: "admin" },
      });
    });
  });

  describe("adminLogout", () => {
    test("should clear admin_jwt_token cookie", () => {
      adminController.adminLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith("admin_jwt_token", {
        path: "/",
      });
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out" });
    });
  });

  describe("getMe", () => {
    test("should return admin data from request", () => {
      req.admin = { id: 1, username: "admin", role: "admin" };

      adminController.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith({ admin: req.admin });
    });
  });

  describe("getDashboard", () => {
    test("should return dashboard stats", async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5) // bannedUsers
        .mockResolvedValueOnce(20); // onlineUsers

      prisma.post.count.mockResolvedValue(50);

      await adminController.getDashboard(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        totalUsers: 100,
        bannedUsers: 5,
        totalPosts: 50,
        onlineUsers: 20,
      });
    });

    test("should call next with error on database error", async () => {
      const error = new Error("DB error");
      prisma.user.count.mockRejectedValue(error);

      await adminController.getDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getUsers", () => {
    test("should return users with default pagination", async () => {
      const users = [{ id: 1, username: "user1" }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      await adminController.getUsers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        users,
        total: 1,
        page: 1,
        pages: 1,
      });
    });

    test("should handle search query", async () => {
      req.query = { search: "user1", page: 1, limit: 20 };
      const users = [{ id: 1, username: "user1" }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      await adminController.getUsers(req, res, next);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    test("should handle pagination", async () => {
      req.query = { page: 2, limit: 10 };
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(25);

      await adminController.getUsers(req, res, next);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    test("should call next with error on database error", async () => {
      const error = new Error("DB error");
      prisma.user.findMany.mockRejectedValue(error);

      await adminController.getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateUserRole", () => {
    test("should throw error for invalid role", async () => {
      req.params = { id: "2" };
      req.body = { role: "invalid" };

      await adminController.updateUserRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if non-superadmin tries to grant admin", async () => {
      req.admin = { id: 1, role: "admin" };
      req.params = { id: "2" };
      req.body = { role: "admin" };

      await adminController.updateUserRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should allow superadmin to grant admin role", async () => {
      req.params = { id: "2" };
      req.body = { role: "admin" };
      const updatedUser = { id: 2, username: "user2", role: "admin" };
      prisma.user.update.mockResolvedValue(updatedUser);

      await adminController.updateUserRole(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ user: updatedUser });
    });

    test("should allow downgrading admin to user", async () => {
      req.params = { id: "2" };
      req.body = { role: "user" };
      const updatedUser = { id: 2, username: "user2", role: "user" };
      prisma.user.update.mockResolvedValue(updatedUser);

      await adminController.updateUserRole(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ user: updatedUser });
    });
  });

  describe("banUser", () => {
    test("should throw error if trying to ban yourself", async () => {
      req.admin = { id: 1, role: "superadmin" };
      req.params = { id: "1" };

      await adminController.banUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should ban user", async () => {
      req.params = { id: "2" };
      const bannedUser = { id: 2, username: "user2", isBanned: true };
      prisma.user.update.mockResolvedValue(bannedUser);

      await adminController.banUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ user: bannedUser });
    });
  });

  describe("unbanUser", () => {
    test("should unban user", async () => {
      req.params = { id: "2" };
      const unbannedUser = { id: 2, username: "user2", isBanned: false };
      prisma.user.update.mockResolvedValue(unbannedUser);

      await adminController.unbanUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ user: unbannedUser });
    });
  });

  describe("deleteUser", () => {
    test("should throw error if not superadmin", async () => {
      req.admin = { id: 1, role: "admin" };
      req.params = { id: "2" };

      await adminController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if trying to delete yourself", async () => {
      req.params = { id: "1" };

      await adminController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should delete user", async () => {
      req.params = { id: "2" };
      prisma.user.delete.mockResolvedValue({ id: 2 });

      await adminController.deleteUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ message: "User deleted" });
    });
  });

  describe("getAdminPermissions", () => {
    test("should return admin permissions from Vault", async () => {
      req.params = { id: "1" };
      const permissions = { canBan: true, canDelete: false };
      Vault.read.mockResolvedValue(permissions);

      await adminController.getAdminPermissions(req, res, next);

      expect(Vault.read).toHaveBeenCalledWith(
        "secret/data/alpacaparty/admins/1",
      );
      expect(res.json).toHaveBeenCalledWith({ permissions });
    });

    test("should return empty object if no permissions found", async () => {
      req.params = { id: "1" };
      Vault.read.mockResolvedValue(null);

      await adminController.getAdminPermissions(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ permissions: {} });
    });
  });

  describe("setAdminPermissions", () => {
    test("should throw error if not superadmin", async () => {
      req.admin = { id: 1, role: "admin" };
      req.params = { id: "2" };
      req.body = { permissions: {} };

      await adminController.setAdminPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should throw error if permissions not provided", async () => {
      req.params = { id: "2" };
      req.body = {};

      await adminController.setAdminPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });

    test("should set admin permissions", async () => {
      req.params = { id: "2" };
      const permissions = { canBan: true, canDelete: true };
      req.body = { permissions };
      Vault.write.mockResolvedValue(undefined);

      await adminController.setAdminPermissions(req, res, next);

      expect(Vault.write).toHaveBeenCalledWith(
        "secret/data/alpacaparty/admins/2",
        permissions,
      );
      expect(res.json).toHaveBeenCalledWith({ permissions });
    });
  });
});
