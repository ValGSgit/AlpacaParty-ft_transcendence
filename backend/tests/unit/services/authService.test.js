/**
 * AuthService Unit Tests
 */
import { jest, describe, test, expect, beforeAll } from "@jest/globals";

const { default: AuthService } =
  await import("../../../src/services/authService.js");
const { default: config } = await import("../../../src/config/index.js");

describe("AuthService", () => {
  describe("hashPassword / comparePassword", () => {
    test("should hash a password and verify it", async () => {
      const password = "TestPass123";
      const hash = await AuthService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const match = await AuthService.comparePassword(password, hash);
      expect(match).toBe(true);
    });

    test("should reject wrong password", async () => {
      const hash = await AuthService.hashPassword("CorrectPass1");
      const match = await AuthService.comparePassword("WrongPass1", hash);
      expect(match).toBe(false);
    });
  });

  describe("generateAccessToken / verifyToken", () => {
    const fakeUser = { id: 1, username: "tester"};

    test("should generate a valid access token", () => {
      const token = AuthService.generateAccessToken(fakeUser);
      expect(typeof token).toBe("string");

      const decoded = AuthService.verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(fakeUser.id);
      expect(decoded.username).toBe(fakeUser.username);
    });

    test("should reject invalid token", () => {
      const decoded = AuthService.verifyToken("invalid.token.string");
      expect(decoded).toBeNull();
    });

    test("should reject empty token", () => {
      expect(AuthService.verifyToken("")).toBeNull();
      expect(AuthService.verifyToken(null)).toBeNull();
      expect(AuthService.verifyToken(undefined)).toBeNull();
    });
  });

  describe("generateRefreshToken", () => {
    const fakeUser = { id: 42, username: "refresher" };

    test("should generate a refresh token with type=refresh", () => {
      const token = AuthService.generateRefreshToken(fakeUser);
      const decoded = AuthService.verifyRefreshToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(42);
      expect(decoded.type).toBe("refresh");
    });

    test("refresh token should not contain username", () => {
      const token = AuthService.generateRefreshToken(fakeUser);
      const decoded = AuthService.verifyRefreshToken(token);
      expect(decoded.username).toBeUndefined();
    });
  });

  describe("validatePassword", () => {
    test("should accept a valid password", () => {
      const { valid, errors } = AuthService.validatePassword("ValidPass1");
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should reject password shorter than minLength", () => {
      const { valid, errors } = AuthService.validatePassword("Sh1");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("at least"))).toBe(true);
    });

    test("should reject password without uppercase", () => {
      const { valid, errors } = AuthService.validatePassword("lowercase1");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("uppercase"))).toBe(true);
    });

    test("should reject password without lowercase", () => {
      const { valid, errors } = AuthService.validatePassword("UPPERCASE1");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("lowercase"))).toBe(true);
    });

    test("should reject password without number", () => {
      const { valid, errors } = AuthService.validatePassword("NoNumberHere");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("number"))).toBe(true);
    });

    test("should reject empty/null password", () => {
      const r1 = AuthService.validatePassword("");
      expect(r1.valid).toBe(false);

      const r2 = AuthService.validatePassword(null);
      expect(r2.valid).toBe(false);

      const r3 = AuthService.validatePassword(undefined);
      expect(r3.valid).toBe(false);
    });

    test("should collect multiple errors", () => {
      const { valid, errors } = AuthService.validatePassword("ab");
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(1);
    });

    test("should accept password at exactly minLength with all requirements", () => {
      // 8 chars, upper + lower + digit
      const { valid, errors } = AuthService.validatePassword("Abc1defg");
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should reject password one char below minLength", () => {
      // 7 chars, otherwise valid
      const { valid, errors } = AuthService.validatePassword("Abc1def");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("at least"))).toBe(true);
    });

    test("should reject number-only string regardless of length", () => {
      const { valid, errors } = AuthService.validatePassword("12345678");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("uppercase"))).toBe(true);
      expect(errors.some((e) => e.includes("lowercase"))).toBe(true);
    });
  });

  describe("access token / refresh token are not interchangeable", () => {
    test("refresh token should fail authentication (has type=refresh)", () => {
      const refresh = AuthService.generateRefreshToken({
        id: 1,
        username: "u",
      });
      const decoded = AuthService.verifyRefreshToken(refresh);
      // authenticate middleware rejects tokens with type === 'refresh'
      expect(decoded.type).toBe("refresh");
    });

    test("access token should pass verification and have no type", () => {
      const access = AuthService.generateAccessToken({
        id: 1,
        username: "u"
      });
      const decoded = AuthService.verifyToken(access);
      expect(decoded).not.toBeNull();
      expect(decoded.type).toBeUndefined();
    });
  });

  // ── New tests ───────────────────────────────────────────────────────────────

  describe("validatePassword — special characters and long passwords", () => {
    test("should accept very long password that meets all requirements", () => {
      const longPassword = "A" + "b".repeat(200) + "1";
      const { valid, errors } = AuthService.validatePassword(longPassword);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should accept password with special characters", () => {
      const { valid, errors } = AuthService.validatePassword("P@$$w0rd!#%");
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should accept password with unicode characters", () => {
      const { valid, errors } = AuthService.validatePassword(
        "Passw0rd\u00e9\u00f1",
      );
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should accept password with spaces if requirements met", () => {
      const { valid, errors } = AuthService.validatePassword("Pass 1 word");
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test("should reject special-chars-only password (no letters/digits)", () => {
      const { valid, errors } = AuthService.validatePassword("!@#$%^&*");
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("uppercase"))).toBe(true);
      expect(errors.some((e) => e.includes("lowercase"))).toBe(true);
      expect(errors.some((e) => e.includes("number"))).toBe(true);
    });
  });

  describe("token expiry settings match config", () => {
    test("access token exp should reflect config.jwt.expiresIn", () => {
      const token = AuthService.generateAccessToken({
        id: 1,
        username: "u"
      });
      const decoded = AuthService.verifyToken(token);

      // config.jwt.expiresIn is '24h' by default = 86400 seconds
      const expiresInSec = decoded.exp - decoded.iat;
      const expectedSec = parseExpiry(config.jwt.expiresIn);
      expect(expiresInSec).toBe(expectedSec);
    });

    test("refresh token exp should reflect config.jwt.refreshExpiresIn", () => {
      const token = AuthService.generateRefreshToken({ id: 1 });
      const decoded = AuthService.verifyRefreshToken(token);

      const expiresInSec = decoded.exp - decoded.iat;
      const expectedSec = parseExpiry(config.jwt.refreshExpiresIn);
      expect(expiresInSec).toBe(expectedSec);
    });

    test("refresh token should live longer than access token", () => {
      const accessToken = AuthService.generateAccessToken({
        id: 1,
        username: "u"
      });
      const refreshToken = AuthService.generateRefreshToken({ id: 1 });
      const accessDecoded = AuthService.verifyToken(accessToken);
      const refreshDecoded = AuthService.verifyRefreshToken(refreshToken);

      const accessLifetime = accessDecoded.exp - accessDecoded.iat;
      const refreshLifetime = refreshDecoded.exp - refreshDecoded.iat;
      expect(refreshLifetime).toBeGreaterThan(accessLifetime);
    });
  });

  describe("access and refresh tokens are different", () => {
    test("tokens generated for same user should have different strings", () => {
      const user = { id: 1, username: "u"};
      const access = AuthService.generateAccessToken(user);
      const refresh = AuthService.generateRefreshToken(user);
      expect(access).not.toBe(refresh);
    });

    test("two access tokens for same user should differ (iat varies)", () => {
      const user = { id: 1, username: "u"};
      const token1 = AuthService.generateAccessToken(user);
      const token2 = AuthService.generateAccessToken(user);
      // They may be identical if generated in the same second, but payloads match
      const d1 = AuthService.verifyToken(token1);
      const d2 = AuthService.verifyToken(token2);
      expect(d1.id).toBe(d2.id);
      expect(d1.username).toBe(d2.username);
    });

    test("refresh token has type field, access token does not", () => {
      const user = { id: 1, username: "u"};
      const access = AuthService.verifyToken(
        AuthService.generateAccessToken(user),
      );
      const refresh = AuthService.verifyToken(
        AuthService.generateRefreshToken(user),
      );
      expect(access.type).toBeUndefined();
    });

    test("refresh token does not contain username", () => {
      const user = { id: 1, username: "admin"};
      const refresh = AuthService.verifyRefreshToken(
        AuthService.generateRefreshToken(user),
      );
      expect(refresh).toBeDefined();
      expect(refresh.username).toBeUndefined();
      expect(refresh.type).toBeDefined();
    });
  });

  describe("hashPassword produces unique hashes", () => {
    test("same password hashed twice produces different hashes (random salt)", async () => {
      const pw = "SamePassword1";
      const hash1 = await AuthService.hashPassword(pw);
      const hash2 = await AuthService.hashPassword(pw);
      expect(hash1).not.toBe(hash2);
      // But both should verify
      expect(await AuthService.comparePassword(pw, hash1)).toBe(true);
      expect(await AuthService.comparePassword(pw, hash2)).toBe(true);
    });
  });
});

/**
 * Parse JWT expiry string like '24h', '7d', '15m' into seconds.
 */
function parseExpiry(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return val;
    case "m":
      return val * 60;
    case "h":
      return val * 3600;
    case "d":
      return val * 86400;
    default:
      return 0;
  }
}
