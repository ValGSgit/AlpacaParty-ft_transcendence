import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import CustomError from "#utils/CustomError.js";

const mockAuthService = {
  verifyAdminToken: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule("../../../src/services/authService.js", () => ({
  default: mockAuthService,
}));
jest.unstable_mockModule("#config/prisma.js", () => ({ default: mockPrisma }));

const { requireAdmin, requireSuperAdmin } =
  await import("../../../src/middleware/admin.js");
const { default: AuthService } =
  await import("../../../src/services/authService.js");
const { default: prisma } = await import("#config/prisma.js");

describe("Admin Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      cookies: {},
      admin: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("requireAdmin", () => {
    test("should throw error if no token provided", async () => {
      req.cookies.admin_jwt_token = undefined;

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Admin authentication required");
      expect(error.statusCode).toBe(401);
    });

    test("should throw error if token is invalid", async () => {
      req.cookies.admin_jwt_token = "invalid-token";
      AuthService.verifyAdminToken.mockReturnValue(null);

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Invalid or expired admin token");
      expect(error.statusCode).toBe(401);
    });

    test("should throw error if user not found", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      AuthService.verifyAdminToken.mockReturnValue({ id: 999 });
      prisma.user.findUnique.mockResolvedValue(null);

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Admin user not found");
      expect(error.statusCode).toBe(401);
    });

    test("should throw error if user is banned", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      const decodedUser = { id: 1, username: "admin", role: "admin" };
      AuthService.verifyAdminToken.mockReturnValue(decodedUser);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
        isBanned: true,
      });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Account is banned");
      expect(error.statusCode).toBe(403);
    });

    test("should throw error if user role is not admin or superadmin", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      const decodedUser = { id: 2, username: "user", role: "user" };
      AuthService.verifyAdminToken.mockReturnValue(decodedUser);
      prisma.user.findUnique.mockResolvedValue({
        id: 2,
        username: "user",
        email: "user@test.com",
        role: "user",
        isBanned: false,
      });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Insufficient privileges");
      expect(error.statusCode).toBe(403);
    });

    test("should attach admin user to request and call next on success", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      const decodedUser = { id: 1, username: "admin" };
      const adminUser = {
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
        isBanned: false,
      };
      AuthService.verifyAdminToken.mockReturnValue(decodedUser);
      prisma.user.findUnique.mockResolvedValue(adminUser);

      await requireAdmin(req, res, next);

      expect(req.admin).toEqual(adminUser);
      expect(next).toHaveBeenCalledWith();
    });

    test("should accept superadmin role", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      const decodedUser = { id: 1, username: "superadmin" };
      const superadminUser = {
        id: 1,
        username: "superadmin",
        email: "superadmin@test.com",
        role: "superadmin",
        isBanned: false,
      };
      AuthService.verifyAdminToken.mockReturnValue(decodedUser);
      prisma.user.findUnique.mockResolvedValue(superadminUser);

      await requireAdmin(req, res, next);

      expect(req.admin).toEqual(superadminUser);
      expect(next).toHaveBeenCalledWith();
    });

    test("should handle token verification exception", async () => {
      req.cookies.admin_jwt_token = "token";
      AuthService.verifyAdminToken.mockImplementation(() => {
        throw new Error("Verification error");
      });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should handle database query exception", async () => {
      req.cookies.admin_jwt_token = "valid-token";
      AuthService.verifyAdminToken.mockReturnValue({ id: 1 });
      prisma.user.findUnique.mockRejectedValue(new Error("DB error"));

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("requireSuperAdmin", () => {
    test("should throw error if req.admin not present", async () => {
      req.admin = null;

      await requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Admin authentication required");
      expect(error.statusCode).toBe(401);
    });

    test("should throw error if admin role is not superadmin", async () => {
      req.admin = {
        id: 1,
        username: "admin",
        role: "admin",
      };

      await requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain("Superadmin privileges required");
      expect(error.statusCode).toBe(403);
    });

    test("should call next if admin is superadmin", async () => {
      req.admin = {
        id: 1,
        username: "superadmin",
        role: "superadmin",
      };

      await requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test("should handle exceptions", async () => {
      req.admin = null;

      await requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    });
  });
});
