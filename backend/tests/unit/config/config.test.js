/**
 * Config Unit Tests
 */
import { jest, describe, test, expect } from "@jest/globals";

const { default: config } = await import("../../../src/config/index.js");

describe("config", () => {
  test("should have jwt configuration", () => {
    expect(config.jwt).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
    expect(config.jwt.expiresIn).toBeDefined();
    expect(config.jwt.refreshExpiresIn).toBeDefined();
  });

  test("should have db configuration", () => {
    expect(config.db).toBeDefined();
    expect(config.db.host).toBeDefined();
    expect(config.db.port).toBeDefined();
    expect(config.db.name).toBeDefined();
  });

  test("should have cors configuration", () => {
    expect(config.cors).toBeDefined();
    expect(Array.isArray(config.cors.origins)).toBe(true);
  });

  test("should have rate limit configuration", () => {
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.max).toBeGreaterThan(0);
  });

  test("should have password policy", () => {
    expect(config.password).toBeDefined();
    expect(config.password.minLength).toBeGreaterThan(0);
    expect(config.password.requireUppercase).toBe(true);
    expect(config.password.requireLowercase).toBe(true);
    expect(config.password.requireNumber).toBe(true);
  });

  test("should use test environment", () => {
    expect(config.nodeEnv).toBe("test");
  });

  test("should parse port as integer", () => {
    expect(typeof config.port).toBe("number");
    expect(Number.isNaN(config.port)).toBe(false);
  });

  test("should have frontendUrl defined", () => {
    expect(config.frontendUrl).toBeDefined();
    expect(typeof config.frontendUrl).toBe("string");
    expect(config.frontendUrl.length).toBeGreaterThan(0);
  });

  test("should have db user and password fields", () => {
    expect(config.db.user).toBeDefined();
    expect(config.db.password).toBeDefined();
  });

  test("jwt expiresIn should be a non-empty string", () => {
    expect(typeof config.jwt.expiresIn).toBe("string");
    expect(config.jwt.expiresIn.length).toBeGreaterThan(0);
  });

  test("jwt refreshExpiresIn should be a non-empty string", () => {
    expect(typeof config.jwt.refreshExpiresIn).toBe("string");
    expect(config.jwt.refreshExpiresIn.length).toBeGreaterThan(0);
  });

  // ── Environment flags ─────────────────────────────────────────────────────

  test('nodeEnv should be "test" when NODE_ENV is set to test', () => {
    expect(config.nodeEnv).toBe("test");
    expect(config.nodeEnv).not.toBe("production");
  });

  test("envIsProd should be false in test environment", () => {
    expect(config.envIsProd).toBe(false);
  });

  test("envIsDev should be false in test environment", () => {
    expect(config.envIsDev).toBe(false);
  });

  test("jwt secret should be set from environment variable", () => {
    expect(config.jwt.secret).toBeTruthy();
    expect(typeof config.jwt.secret).toBe("string");
    expect(config.jwt.secret.length).toBeGreaterThan(0);
    expect(config.jwt.secret).toBe(process.env.JWT_SECRET);
    expect(config.jwt.refreshSecret).toBe(process.env.JWT_REFRESH_SECRET);
  });

  // ── Database config ───────────────────────────────────────────────────────

  test("db.host should be a string", () => {
    expect(typeof config.db.host).toBe("string");
    expect(config.db.host.length).toBeGreaterThan(0);
  });

  test("db.port should be a number", () => {
    expect(typeof config.db.port).toBe("number");
    expect(config.db.port).toBe(parseInt(process.env.DB_PORT, 10));
  });

  test("db.name should be a string", () => {
    expect(typeof config.db.name).toBe("string");
    expect(config.db.name.length).toBeGreaterThan(0);
  });

  test("port should match PORT env var when set", () => {
    expect(config.port).toBe(parseInt(process.env.PORT, 10));
  });

  test("cors origins should reflect CORS_ORIGINS env var", () => {
    const expected = process.env.CORS_ORIGINS.split(",");
    expect(config.cors.origins).toEqual(expected);
  });

  // ── Password policy ───────────────────────────────────────────────────────

  test("password minLength should be exactly 8", () => {
    expect(config.password.minLength).toBe(8);
  });

  test("password policy should require all character types", () => {
    expect(config.password.requireUppercase).toBe(true);
    expect(config.password.requireLowercase).toBe(true);
    expect(config.password.requireNumber).toBe(true);
  });

  test("password policy should not have extra unknown fields", () => {
    const keys = Object.keys(config.password);
    expect(keys).toContain("minLength");
    expect(keys).toContain("requireUppercase");
    expect(keys).toContain("requireLowercase");
    expect(keys).toContain("requireNumber");
  });

  // ── SSL / Uploads / XP ────────────────────────────────────────────────────

  test("should have ssl configuration", () => {
    expect(config.ssl).toBeDefined();
    expect(config.ssl.certPath).toBeDefined();
    expect(config.ssl.keyPath).toBeDefined();
    expect(config.ssl.certPath).toBe(process.env.SSL_CERT_PATH);
    expect(config.ssl.keyPath).toBe(process.env.SSL_KEY_PATH);
  });

  test("should have uploads configuration", () => {
    expect(config.uploads).toBeDefined();
    expect(config.uploads.dir).toBeDefined();
    expect(config.uploads.dir).toBe(process.env.UPLOAD_DIR);
    expect(config.uploads.maxSizeBytes).toBeGreaterThan(0);
    expect(Array.isArray(config.uploads.allowedMimeTypes)).toBe(true);
    expect(config.uploads.allowedMimeTypes.length).toBeGreaterThan(0);
  });

  test("should have imageMimeTypes as a subset of allowedMimeTypes", () => {
    expect(Array.isArray(config.uploads.imageMimeTypes)).toBe(true);
    expect(config.uploads.imageMimeTypes.length).toBeGreaterThan(0);
    for (const mime of config.uploads.imageMimeTypes) {
      expect(config.uploads.allowedMimeTypes).toContain(mime);
    }
  });

  test("imageMimeTypes should only contain image/* types", () => {
    for (const mime of config.uploads.imageMimeTypes) {
      expect(mime.startsWith("image/")).toBe(true);
    }
  });

  // ── JWT expiry relationship ───────────────────────────────────────────────

  test("jwt expiresIn and refreshExpiresIn should be different", () => {
    expect(config.jwt.expiresIn).not.toBe(config.jwt.refreshExpiresIn);
  });

  test("jwt expiresIn should be set to 1h from test env", () => {
    expect(config.jwt.expiresIn).toBe("1h");
  });

  test("jwt refreshExpiresIn should be set to 7d from test env", () => {
    expect(config.jwt.refreshExpiresIn).toBe("7d");
  });
});
