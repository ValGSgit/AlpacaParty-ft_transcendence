import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock the CustomError class so we can easily check its properties
class MockCustomError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
jest.unstable_mockModule("#utils/CustomError.js", () => ({
  default: MockCustomError,
}));

const mockUser = {
  findByApiKey: jest.fn(),
};
jest.unstable_mockModule("#models/User.js", () => ({
  default: mockUser,
}));

const mockAuthService = {
  verifyPublicApiToken: jest.fn(),
  verifyToken: jest.fn(),
};
jest.unstable_mockModule("#services/authService.js", () => ({
  default: mockAuthService,
}));

// Import the middleware AFTER the mocks are registered
// Note: Adjust the import path to match where your middleware file is located
const { requireApiKey } = await import("#middleware/apiKey.js");

// ── Helpers ──────────────────────────────────────────────────────────────────

function createReqRes(headers = {}) {
  const req = {
    headers,
  };
  const res = {}; // The middleware doesn't use 'res', so an empty object is fine
  const next = jest.fn();

  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("requireApiKey Middleware", () => {
  test("should call next with a 401 error if no API key is provided", async () => {
    const { req, res, next } = createReqRes({}); // No headers

    await requireApiKey(req, res, next);

    expect(mockAuthService.verifyPublicApiToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(MockCustomError));

    const errorPassedToNext = next.mock.calls[0][0];
    expect(errorPassedToNext.message).toBe("No api key provided");
    expect(errorPassedToNext.status).toBe(401);
  });

  test("should call next with a 401 error if API key is invalid or expired", async () => {
    const { req, res, next } = createReqRes({ "x-api-key": "invalid-key" });

    // Simulate AuthService returning null/falsy for a bad token
    mockAuthService.verifyPublicApiToken.mockReturnValue(null);

    await requireApiKey(req, res, next);

    expect(mockAuthService.verifyPublicApiToken).toHaveBeenCalledWith(
      "invalid-key",
    );
    expect(mockUser.findByApiKey).not.toHaveBeenCalled();

    const errorPassedToNext = next.mock.calls[0][0];
    expect(errorPassedToNext.message).toBe("Invalid or expired api key");
    expect(errorPassedToNext.status).toBe(401);
  });

  test("should call next with a 401 error if API key is valid but revoked/user not found", async () => {
    const { req, res, next } = createReqRes({
      "x-api-key": "valid-format-key",
    });

    // Simulate valid token format, but no user matches it in the DB
    mockAuthService.verifyPublicApiToken.mockReturnValue({ iat: 123456 });
    mockUser.findByApiKey.mockResolvedValue(null);

    await requireApiKey(req, res, next);

    expect(mockAuthService.verifyPublicApiToken).toHaveBeenCalledWith(
      "valid-format-key",
    );
    expect(mockUser.findByApiKey).toHaveBeenCalledWith("valid-format-key");

    const errorPassedToNext = next.mock.calls[0][0];
    expect(errorPassedToNext.message).toBe("Invalid or revoked api key");
    expect(errorPassedToNext.status).toBe(401);
  });

  test("should set req.userId and call next() on success", async () => {
    const { req, res, next } = createReqRes({ "x-api-key": "good-key" });
    const expectedUserId = 99;

    // Simulate completely successful validations
    mockAuthService.verifyPublicApiToken.mockReturnValue({ iat: 123456 });
    mockUser.findByApiKey.mockResolvedValue(expectedUserId);

    await requireApiKey(req, res, next);

    expect(mockAuthService.verifyPublicApiToken).toHaveBeenCalledWith(
      "good-key",
    );
    expect(mockUser.findByApiKey).toHaveBeenCalledWith("good-key");

    // Verify user ID was attached correctly
    expect(req.userId).toBe(expectedUserId);

    // Verify next was called with NO arguments (meaning success)
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("should catch unexpected errors and pass them to next()", async () => {
    const { req, res, next } = createReqRes({ "x-api-key": "trigger-error" });
    const unexpectedError = new Error("Database connection failed");

    mockAuthService.verifyPublicApiToken.mockReturnValue({ iat: 123456 });
    mockUser.findByApiKey.mockRejectedValue(unexpectedError);

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(unexpectedError);
  });
});
