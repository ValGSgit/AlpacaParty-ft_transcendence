/**
 * User Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userAuth: {
    update: jest.fn(),
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
  isAdmin: false,
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
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "tester" },
    });
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
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "tester@example.com" },
    });
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
        data: {
          username: "tester",
          email: "tester@example.com",
          passwordHash: "hashedpw",
        },
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
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
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
  test("should pass term as startsWith pattern", async () => {
    mockPrisma.user.findMany.mockResolvedValue([fakeUser]);
    const result = await User.search("test");
    expect(result).toHaveLength(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              username: { startsWith: "test", mode: "insensitive" },
            }),
          ]),
        }),
      }),
    );
  });

  test("should return empty array when no matches", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    const result = await User.search("zzz");
    expect(result).toHaveLength(0);
  });

  test("should forward custom limit", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await User.search("abc", { limit: 5 });
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
