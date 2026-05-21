/**
 * User Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userAuth: {
    update: jest.fn(),
  },
  userSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  publicApi: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  alpacaFarm: {
    upsert: jest.fn(),
  },
  friend: {
    findMany: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
  },
  game: {
    findMany: jest.fn(),
  },
  post: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule("#config/prisma.js", () => ({
  default: mockPrisma,
}));

const { default: User } = await import("../../../src/models/User.js");

const fakeUser = {
  id: 1,
  username: "tester",
  email: "tester@example.com",
  avatar: null,
  bio: null,
  status: "online",
  isOnline: true,
  lastSeen: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("User.findById", () => {
  test("should return a user when found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    const result = await User.findById(1);
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  test("should return null when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await User.findById(999);
    expect(result).toBeNull();
  });
});

describe("User.findByUsername", () => {
  test("should return the matching user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    const result = await User.findByUsername("tester");
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: "tester" },
      }),
    );
  });

  test("should return null when username not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await User.findByUsername("ghost");
    expect(result).toBeNull();
  });
});

describe("User.findByEmail", () => {
  test("should return the matching user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    const result = await User.findByEmail("tester@example.com");
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "tester@example.com" },
      }),
    );
  });

  test("should return null when email not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await User.findByEmail("nobody@example.com");
    expect(result).toBeNull();
  });
});

describe("User.create", () => {
  test("should return the newly created user", async () => {
    mockPrisma.user.create.mockResolvedValue(fakeUser);
    const result = await User.create({
      username: "tester",
      email: "tester@example.com",
      passwordHash: "hashedpw",
    });
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "tester",
          email: "tester@example.com",
          userAuth: { create: { passwordHash: "hashedpw" } },
        }),
      }),
    );
  });
});

describe("User.update", () => {
  test("should return updated user on valid fields", async () => {
    const updated = { ...fakeUser, bio: "New bio" };
    mockPrisma.user.update.mockResolvedValue(updated);
    const result = await User.update(1, { bio: "New bio" });
    expect(result.bio).toBe("New bio");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { bio: "New bio" } }),
    );
  });

  test("should call findById when no valid fields supplied", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    const result = await User.update(1, { unknown_field: "ignored" });
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  test("should return null when user not found after update", async () => {
    mockPrisma.user.update.mockResolvedValue(null);
    const result = await User.update(999, { bio: "ghost" });
    expect(result).toBeNull();
  });
});

describe("User.updatePassword", () => {
  test("should call update with new hash and id", async () => {
    mockPrisma.userAuth.update.mockResolvedValue({});
    await User.updatePassword(1, "newhash");
    expect(mockPrisma.userAuth.update).toHaveBeenCalledWith({
      where: { userId: 1 },
      data: { passwordHash: "newhash" },
    });
  });
});

describe("User.setOnline", () => {
  test("should call update with isOnline=true", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await User.setOnline(1, true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ isOnline: true }),
      }),
    );
  });

  test("should call update with isOnline=false", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await User.setOnline(1, false);
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data.isOnline).toBe(false);
  });
});

describe("User.findAll", () => {
  test("should return array of users with default pagination", async () => {
    mockPrisma.user.findMany.mockResolvedValue([fakeUser]);
    const result = await User.findAll();
    expect(Array.isArray(result.usersFound)).toBe(true);
    expect(result.usersFound).toHaveLength(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });

  test("should forward custom limit and offset", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await User.findAll({ limit: 10, offset: 20 });
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });
});

describe("User.search", () => {
  test("should pass term as contains pattern", async () => {
    mockPrisma.user.findMany.mockResolvedValue([fakeUser]);
    const filter = { username: "test" };
    const result = await User.search({ filter });
    expect(result.usersFound).toHaveLength(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              username: { contains: "test", mode: "insensitive" },
            }),
          ]),
        }),
      }),
    );
  });

  test("should return empty array when no matches", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    const result = await User.search("zzz");
    expect(result.usersFound).toHaveLength(0);
  });

  test("should forward custom limit", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await User.search({ limit: 5 });
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});

describe("User.findByIdWithPassword", () => {
  test("should return user including passwordHash", async () => {
    const withPw = { ...fakeUser, passwordHash: "secret" };
    mockPrisma.user.findUnique.mockResolvedValue(withPw);
    const result = await User.findByIdWithPassword(1);
    expect(result.passwordHash).toBe("secret");
  });

  test("should return null when not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await User.findByIdWithPassword(999);
    expect(result).toBeNull();
  });
});

describe("User.findOrCreateOAuth", () => {
  test("should return existing user when OAuth account exists", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(fakeUser);
    const result = await User.findOrCreateOAuth({
      provider: "github",
      oauthId: "123",
      username: "test",
      email: "test@example.com",
    });
    expect(result.user).toEqual(fakeUser);
    expect(result.created).toBe(false);
  });

  test("should link to existing email when creating OAuth user", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue(fakeUser);
    const result = await User.findOrCreateOAuth({
      provider: "google",
      oauthId: "456",
      username: "newuser",
      email: "existing@example.com",
      avatar: "/avatar.jpg",
    });
    expect(result.created).toBe(true);
    expect(mockPrisma.user.upsert).toHaveBeenCalled();
  });

  test("should create user with internal email when no email provided", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(fakeUser);
    const result = await User.findOrCreateOAuth({
      provider: "github",
      oauthId: "789",
      username: "nomail",
    });
    expect(result.created).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "github_789@oauth.internal",
        }),
      }),
    );
  });

  test("should use default avatar when not provided", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(fakeUser);
    await User.findOrCreateOAuth({
      provider: "github",
      oauthId: "789",
      username: "nomail",
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatar: "/avatars/default.svg",
        }),
      }),
    );
  });
});

describe("User.update — complex field handling", () => {
  beforeEach(() => {
    mockPrisma.user.update.mockResolvedValue(fakeUser);
    mockPrisma.userSettings.upsert.mockResolvedValue({});
    mockPrisma.alpacaFarm.upsert.mockResolvedValue({});
  });

  test("should update user fields only", async () => {
    await User.update(1, { username: "newname", email: "new@example.com" });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "newname",
          email: "new@example.com",
        }),
      }),
    );
  });

  test("should update settings fields", async () => {
    await User.update(1, { isPublic: true });
    expect(mockPrisma.userSettings.upsert).toHaveBeenCalled();
  });

  test("should update farm fields", async () => {
    await User.update(1, { coins: 100, alpacas: [] });
    expect(mockPrisma.alpacaFarm.upsert).toHaveBeenCalled();
  });

  test("should update multiple field types at once", async () => {
    mockPrisma.user.update.mockResolvedValue(fakeUser);
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);

    await User.update(1, {
      bio: "new bio",
      isPublic: false,
      coins: 50,
    });

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.userSettings.upsert).toHaveBeenCalled();
    expect(mockPrisma.alpacaFarm.upsert).toHaveBeenCalled();
  });

  test("should return null when updatedUser is null", async () => {
    mockPrisma.user.update.mockResolvedValue(null);
    const result = await User.update(1, { bio: "test" });
    expect(result).toBeNull();
  });
});

describe("User.setOffline", () => {
  test("should set isOnline to false", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await User.setOffline(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ isOnline: false }),
      }),
    );
  });
});

describe("User.count", () => {
  test("should return total user count", async () => {
    mockPrisma.user.count.mockResolvedValue(42);
    const result = await User.count();
    expect(result).toBe(42);
  });
});

describe("User.deleteById", () => {
  test("should return true when user is deleted", async () => {
    mockPrisma.user.delete.mockResolvedValue({});
    const result = await User.deleteById(1);
    expect(result).toBe(true);
  });

  test("should return false when user not found", async () => {
    mockPrisma.user.delete.mockRejectedValue(new Error("Not found"));
    const result = await User.deleteById(999);
    expect(result).toBe(false);
  });
});

describe("User API Key methods", () => {
  test("getApiKey should return key from settings", async () => {
    mockPrisma.publicApi.findUnique.mockResolvedValue({ apiKey: "key123" });
    const result = await User.getApiKey(1);
    expect(result).toBe("key123");
  });

  test("getApiKey should return null when not set", async () => {
    mockPrisma.publicApi.findUnique.mockResolvedValue(null);
    const result = await User.getApiKey(1);
    expect(result).toBeNull();
  });

  test("setApiKey should upsert key", async () => {
    mockPrisma.publicApi.upsert.mockResolvedValue({});
    const result = await User.setApiKey(1, "newkey");
    expect(result).toBe("newkey");
    expect(mockPrisma.publicApi.upsert).toHaveBeenCalled();
  });

  test("revokeApiKey should set key to null", async () => {
    mockPrisma.publicApi.update.mockResolvedValue({});
    await User.revokeApiKey(1);
    expect(mockPrisma.publicApi.deleteMany).toHaveBeenCalled();
  });

  test("findByApiKey should return userId", async () => {
    mockPrisma.publicApi.findUnique.mockResolvedValue({ userId: 42 });
    const result = await User.findByApiKey("key123");
    expect(result).toBe(42);
  });

  test("findByApiKey should return null when key not found", async () => {
    mockPrisma.publicApi.findUnique.mockResolvedValue(null);
    const result = await User.findByApiKey("invalid");
    expect(result).toBeNull();
  });

  test("findByApiKey should return null when key is empty", async () => {
    const result = await User.findByApiKey("");
    expect(result).toBeNull();
  });

  test("findByApiKey should return null when key is null", async () => {
    const result = await User.findByApiKey(null);
    expect(result).toBeNull();
  });
});

describe("User.getFullExport", () => {
  test("should export all user data", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    mockPrisma.friend.findMany.mockResolvedValue([
      { friend: { id: 2, username: "friend1" } },
    ]);
    mockPrisma.message.findMany.mockResolvedValue([{ id: 1, content: "hi" }]);
    mockPrisma.game.findMany.mockResolvedValue([{ id: 1, player1Id: 1 }]);
    mockPrisma.post.findMany.mockResolvedValue([{ id: 1, content: "post" }]);

    const result = await User.getFullExport(1);
    expect(result.user).toEqual(fakeUser);
    expect(result.friends).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
    expect(result.games).toHaveLength(1);
    expect(result.posts).toHaveLength(1);
  });

  test("should return null user when not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.friend.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.game.findMany.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([]);

    const result = await User.getFullExport(999);
    expect(result.user).toBeNull();
  });
});
