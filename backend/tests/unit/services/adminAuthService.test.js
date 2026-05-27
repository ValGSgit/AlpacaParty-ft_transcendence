import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfig = {
  jwt: {
    adminSecret: "test-secret-key",
    adminExpiresIn: "7d",
  },
};

jest.unstable_mockModule("jsonwebtoken", () => ({ default: mockJwt }));
jest.unstable_mockModule("../../../src/config/index.js", () => ({
  default: mockConfig,
}));

const jwt = mockJwt;
const { default: AuthService } =
  await import("../../../src/services/authService.js");
const { default: config } = await import("../../../src/config/index.js");

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.jwt.adminSecret = "test-secret-key";
    mockConfig.jwt.adminExpiresIn = "7d";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("generateToken", () => {
    test("should generate a JWT token with admin data", () => {
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature";
      jwt.sign.mockReturnValue(mockToken);

      const admin = {
        id: 1,
        username: "admin",
        role: "admin",
      };

      const token = AuthService.generateAdminToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, username: "admin", role: "admin" },
        "test-secret-key",
        { expiresIn: "7d" },
      );
      expect(token).toBe(mockToken);
    });

    test("should generate token with superadmin role", () => {
      const mockToken = "token-superadmin";
      jwt.sign.mockReturnValue(mockToken);

      const superadmin = {
        id: 2,
        username: "superadmin",
        role: "superadmin",
      };

      const token = AuthService.generateAdminToken(superadmin);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 2, username: "superadmin", role: "superadmin" },
        "test-secret-key",
        { expiresIn: "7d" },
      );
      expect(token).toBe(mockToken);
    });

    test("should include only required payload fields", () => {
      jwt.sign.mockReturnValue("token");

      const admin = {
        id: 1,
        username: "admin",
        role: "admin",
        email: "admin@test.com",
        isBanned: false,
        createdAt: new Date(),
      };

      AuthService.generateAdminToken(admin);

      const payload = jwt.sign.mock.calls[0][0];
      expect(payload).toEqual({
        id: 1,
        username: "admin",
        role: "admin",
      });
      expect(payload.email).toBeUndefined();
      expect(payload.isBanned).toBeUndefined();
    });

    test("should use config JWT secret", () => {
      config.jwt.adminSecret = "custom-secret-key";
      jwt.sign.mockReturnValue("token");

      const admin = { id: 1, username: "admin", role: "admin" };
      AuthService.generateAdminToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        "custom-secret-key",
        expect.any(Object),
      );
    });

    test("should use config expiration time", () => {
      config.jwt.adminExpiresIn = "14d";
      jwt.sign.mockReturnValue("token");

      const admin = { id: 1, username: "admin", role: "admin" };
      AuthService.generateAdminToken(admin);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: "14d" },
      );
    });
  });

  describe("verifyToken", () => {
    test("should verify and return payload for valid token", () => {
      const payload = { id: 1, username: "admin", role: "admin" };
      jwt.verify.mockReturnValue(payload);

      const result = AuthService.verifyAdminToken("valid-token");

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-token",
        "test-secret-key",
        { algorithms: ["HS256"] },
      );
      expect(result).toEqual(payload);
    });

    test("should return null for expired token", () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error("jwt expired");
        error.name = "TokenExpiredError";
        throw error;
      });

      const result = AuthService.verifyAdminToken("expired-token");

      expect(result).toBeNull();
    });

    test("should return null for malformed token", () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("malformed token");
      });

      const result = AuthService.verifyAdminToken("malformed-token");

      expect(result).toBeNull();
    });

    test("should return null for invalid signature", () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error("invalid signature");
        error.name = "JsonWebTokenError";
        throw error;
      });

      const result = AuthService.verifyAdminToken("tampered-token");

      expect(result).toBeNull();
    });

    test("should use config JWT secret for verification", () => {
      config.jwt.adminSecret = "custom-secret";
      jwt.verify.mockReturnValue({ id: 1, username: "admin" });

      AuthService.verifyAdminToken("token");

      expect(jwt.verify).toHaveBeenCalledWith("token", "custom-secret", {
        algorithms: ["HS256"],
      });
    });

    test("should verify multiple tokens correctly", () => {
      const payload1 = { id: 1, username: "admin1", role: "admin" };
      const payload2 = { id: 2, username: "admin2", role: "superadmin" };
      jwt.verify.mockReturnValueOnce(payload1).mockReturnValueOnce(payload2);

      const result1 = AuthService.verifyAdminToken("token1");
      const result2 = AuthService.verifyAdminToken("token2");

      expect(result1).toEqual(payload1);
      expect(result2).toEqual(payload2);
    });

    test("should handle empty token", () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("No token provided");
      });

      const result = AuthService.verifyAdminToken("");

      expect(result).toBeNull();
    });

    test("should handle null token", () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Token is null");
      });

      const result = AuthService.verifyAdminToken(null);

      expect(result).toBeNull();
    });
  });

  describe("integration tests", () => {
    test("should generate and verify a token in sequence", () => {
      const admin = { id: 1, username: "admin", role: "admin" };
      const mockToken = "generated-and-verified-token";
      const mockPayload = { id: 1, username: "admin", role: "admin" };

      jwt.sign.mockReturnValue(mockToken);
      jwt.verify.mockReturnValue(mockPayload);

      const generatedToken = AuthService.generateAdminToken(admin);
      const verified = AuthService.verifyAdminToken(generatedToken);

      expect(verified).toEqual(mockPayload);
      expect(jwt.sign).toHaveBeenCalled();
      expect(jwt.verify).toHaveBeenCalled();
    });
  });
});
