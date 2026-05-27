/**
 * Friend Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockPrisma = {
  friendRequest: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  friend: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  blockedUser: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("#config/prisma.js", () => ({ default: mockPrisma }));

const { default: Friend } = await import("../../../src/models/Friend.js");

beforeEach(() => jest.clearAllMocks());

// ── sendRequest ──────────────────────────────────────────────────────────────
describe("sendRequest", () => {
  test("creates a friend request via upsert", async () => {
    mockPrisma.friendRequest.findFirst.mockResolvedValue(null);
    const request = { id: 1, senderId: 1, receiverId: 2, status: "pending" };
    mockPrisma.friendRequest.upsert.mockResolvedValue(request);
    const result = await Friend.sendRequest(1, 2);
    expect(mockPrisma.friendRequest.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { senderId: 1, receiverId: 2 },
          { senderId: 2, receiverId: 1 },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mockPrisma.friendRequest.upsert).toHaveBeenCalledWith({
      where: { senderId_receiverId: { senderId: 1, receiverId: 2 } },
      update: { status: "pending" },
      create: { senderId: 1, receiverId: 2, status: "pending" },
    });
    expect(result).toEqual(request);
  });

  test("throws error when trying to friend yourself", async () => {
    await expect(Friend.sendRequest(1, 1)).rejects.toThrow(
      "Cannot friend yourself",
    );
    try {
      await Friend.sendRequest(1, 1);
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  test("throws 403 when a block exists between users", async () => {
    mockPrisma.blockedUser.findFirst.mockResolvedValue({ id: 1 });
    await expect(Friend.sendRequest(1, 2)).rejects.toMatchObject({
      message: "Cannot send friend request due to block",
      status: 403,
    });
  });

  test("throws 409 when users are already friends", async () => {
    mockPrisma.blockedUser.findFirst.mockResolvedValue(null);
    mockPrisma.friend.findFirst.mockResolvedValue({ id: 1 }); // areFriends → true
    await expect(Friend.sendRequest(1, 2)).rejects.toMatchObject({
      message: "You are already friends",
      status: 409,
    });
  });

  test("returns alreadyPending when same-direction pending request exists", async () => {
    mockPrisma.blockedUser.findFirst.mockResolvedValue(null);
    mockPrisma.friend.findFirst.mockResolvedValue(null);
    const pendingRequest = {
      id: 5,
      senderId: 1,
      receiverId: 2,
      status: "pending",
    };
    mockPrisma.friendRequest.findFirst.mockResolvedValue(pendingRequest);

    const result = await Friend.sendRequest(1, 2);

    expect(result).toEqual({ request: pendingRequest, alreadyPending: true });
    expect(mockPrisma.friendRequest.upsert).not.toHaveBeenCalled();
  });

  test("re-sends a declined request by updating it to pending", async () => {
    mockPrisma.blockedUser.findFirst.mockResolvedValue(null);
    mockPrisma.friend.findFirst.mockResolvedValue(null);
    const declinedRequest = {
      id: 7,
      senderId: 2,
      receiverId: 1,
      status: "declined",
    };
    mockPrisma.friendRequest.findFirst.mockResolvedValue(declinedRequest);
    const updated = { id: 7, senderId: 1, receiverId: 2, status: "pending" };
    mockPrisma.friendRequest.update.mockResolvedValue(updated);

    const result = await Friend.sendRequest(1, 2);

    expect(mockPrisma.friendRequest.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { senderId: 1, receiverId: 2, status: "pending" },
    });
    expect(result).toEqual(updated);
  });

  test("auto-accepts a reverse pending request", async () => {
    const reverseRequest = {
      id: 9,
      senderId: 2,
      receiverId: 1,
      status: "pending",
    };
    const accepted = { ...reverseRequest, status: "accepted" };
    mockPrisma.friendRequest.findFirst.mockResolvedValue(reverseRequest);

    const acceptSpy = jest
      .spyOn(Friend, "acceptRequest")
      .mockResolvedValue(accepted);

    const result = await Friend.sendRequest(1, 2);

    expect(mockPrisma.friendRequest.upsert).not.toHaveBeenCalled();
    expect(acceptSpy).toHaveBeenCalledWith(9, 1);
    expect(result).toEqual({ request: accepted, autoAccepted: true });

    acceptSpy.mockRestore();
  });
});

// ── acceptRequest ────────────────────────────────────────────────────────────
describe("acceptRequest", () => {
  test("accepts request and creates friend records", async () => {
    const request = { id: 1, senderId: 2, receiverId: 1 };
    mockPrisma.friendRequest.findFirst.mockResolvedValue(request);
    const updatedRequest = { ...request, status: "accepted" };
    mockPrisma.$transaction.mockResolvedValue([updatedRequest, { count: 2 }]);
    const result = await Friend.acceptRequest(1, 1);
    expect(mockPrisma.friendRequest.findFirst).toHaveBeenCalledWith({
      where: { id: 1, receiverId: 1, status: "pending" },
    });
    expect(result).toEqual(updatedRequest);
  });

  test("throws 404 when request not found", async () => {
    mockPrisma.friendRequest.findFirst.mockResolvedValue(null);
    await expect(Friend.acceptRequest(999, 1)).rejects.toThrow(
      "Request not found or already handled",
    );
    try {
      await Friend.acceptRequest(999, 1);
    } catch (e) {
      expect(e.status).toBe(404);
    }
  });
});

// ── declineRequest ───────────────────────────────────────────────────────────
describe("declineRequest", () => {
  test("declines request and returns updated record", async () => {
    mockPrisma.friendRequest.updateMany.mockResolvedValue({ count: 1 });
    const declined = { id: 1, status: "declined" };
    mockPrisma.friendRequest.findUnique.mockResolvedValue(declined);
    const result = await Friend.declineRequest(1, 1);
    expect(mockPrisma.friendRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 1, receiverId: 1, status: "pending" },
      data: { status: "declined" },
    });
    expect(result).toEqual(declined);
  });

  test("returns null when request not found", async () => {
    mockPrisma.friendRequest.updateMany.mockResolvedValue({ count: 0 });
    const result = await Friend.declineRequest(999, 1);
    expect(result).toBeNull();
  });
});

// ── removeFriend ─────────────────────────────────────────────────────────────
describe("removeFriend", () => {
  test("deletes both friend records", async () => {
    mockPrisma.friend.deleteMany.mockResolvedValue({ count: 2 });
    await Friend.removeFriend(1, 2);
    expect(mockPrisma.friend.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: 1, friendId: 2 },
          { userId: 2, friendId: 1 },
        ],
      },
    });
  });
});

// ── getFriends ───────────────────────────────────────────────────────────────
describe("getFriends", () => {
  test("returns shaped friend list", async () => {
    mockPrisma.friend.findMany.mockResolvedValue([
      {
        friend: {
          id: 2,
          username: "bob",
          avatar: "/b.png",
          isOnline: true,
          status: "online",
          level: 5,
        },
      },
    ]);
    const result = await Friend.getFriends(1);
    const friendsRes = result.friends;
    expect(friendsRes).toEqual([
      {
        id: 2,
        username: "bob",
        avatar: "/b.png",
        is_online: true,
        status: "online",
        level: 5,
      },
    ]);
  });

  test("applies pagination", async () => {
    mockPrisma.friend.findMany.mockResolvedValue([]);
    await Friend.getFriends(1, { limit: 10, offset: 5 });
    expect(mockPrisma.friend.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 }),
    );
  });

  test("uses default pagination", async () => {
    mockPrisma.friend.findMany.mockResolvedValue([]);
    await Friend.getFriends(1);
    expect(mockPrisma.friend.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });
});

// ── getOnlineFriends ─────────────────────────────────────────────────────────
describe("getOnlineFriends", () => {
  test("returns only online friends", async () => {
    mockPrisma.friend.findMany.mockResolvedValue([
      {
        friend: {
          id: 2,
          username: "bob",
          avatar: "/b.png",
          isOnline: true,
          status: "online",
          level: 5,
        },
      },
    ]);
    const result = await Friend.getOnlineFriends(1);
    expect(mockPrisma.friend.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1, friend: { isOnline: true } },
      }),
    );
    expect(result[0].is_online).toBe(true);
  });
});

// ── getPendingReceived ───────────────────────────────────────────────────────
describe("getPendingReceived", () => {
  test("returns pending received requests with sender info", async () => {
    mockPrisma.friendRequest.findMany.mockResolvedValue([
      {
        id: 1,
        senderId: 2,
        receiverId: 1,
        status: "pending",
        sender: { username: "bob", avatar: "/b.png" },
        createdAt: "2024-01-01",
      },
    ]);
    const result = await Friend.getPendingReceived(1);
    expect(result[0].senderUsername).toBe("bob");
    expect(result[0].senderAvatar).toBe("/b.png");
    expect(result[0].sender).toBeUndefined();
  });
});

// ── getPendingSent ───────────────────────────────────────────────────────────
describe("getPendingSent", () => {
  test("returns pending sent requests with receiver info", async () => {
    mockPrisma.friendRequest.findMany.mockResolvedValue([
      {
        id: 1,
        senderId: 1,
        receiverId: 2,
        status: "pending",
        receiver: { username: "bob", avatar: "/b.png" },
        createdAt: "2024-01-01",
      },
    ]);
    const result = await Friend.getPendingSent(1);
    expect(result[0].receiverUsername).toBe("bob");
    expect(result[0].receiverAvatar).toBe("/b.png");
    expect(result[0].receiver).toBeUndefined();
  });
});

// ── areFriends ───────────────────────────────────────────────────────────────
describe("areFriends", () => {
  test("returns true when friends", async () => {
    mockPrisma.friend.findFirst.mockResolvedValue({ userId: 1, friendId: 2 });
    const result = await Friend.areFriends(1, 2);
    expect(result).toBe(true);
  });

  test("returns false when not friends", async () => {
    mockPrisma.friend.findFirst.mockResolvedValue(null);
    const result = await Friend.areFriends(1, 2);
    expect(result).toBe(false);
  });
});

// ── count ────────────────────────────────────────────────────────────────────
describe("count", () => {
  test("returns friend count", async () => {
    mockPrisma.friend.count.mockResolvedValue(5);
    const result = await Friend.count(1);
    expect(mockPrisma.friend.count).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(result).toBe(5);
  });
});

// ── blockUser ────────────────────────────────────────────────────────────────
describe("blockUser", () => {
  test("removes friend and creates block record", async () => {
    mockPrisma.friend.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.blockedUser.upsert.mockResolvedValue({});
    await Friend.blockUser(1, 2);
    // Should call removeFriend first
    expect(mockPrisma.friend.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: 1, friendId: 2 },
          { userId: 2, friendId: 1 },
        ],
      },
    });
    expect(mockPrisma.blockedUser.upsert).toHaveBeenCalledWith({
      where: { userId_blockedUserId: { userId: 1, blockedUserId: 2 } },
      update: {},
      create: { userId: 1, blockedUserId: 2 },
    });
  });
});

// ── unblockUser ──────────────────────────────────────────────────────────────
describe("unblockUser", () => {
  test("deletes block record", async () => {
    mockPrisma.blockedUser.deleteMany.mockResolvedValue({ count: 1 });
    await Friend.unblockUser(1, 2);
    expect(mockPrisma.blockedUser.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, blockedUserId: 2 },
    });
  });
});

// ── getBlocked ───────────────────────────────────────────────────────────────
describe("getBlocked", () => {
  test("returns blocked users", async () => {
    mockPrisma.blockedUser.findMany.mockResolvedValue([
      { blockedUser: { id: 3, username: "troll", avatar: "/t.png" } },
    ]);
    const result = await Friend.getBlocked(1);
    expect(result).toEqual([{ id: 3, username: "troll", avatar: "/t.png" }]);
  });

  test("returns empty when no blocked users", async () => {
    mockPrisma.blockedUser.findMany.mockResolvedValue([]);
    const result = await Friend.getBlocked(1);
    expect(result).toEqual([]);
  });
});
