/**
 * Friend Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

/** Map a friend user object from Prisma camelCase to frontend snake_case */
function shapeFriend(u) {
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    is_online: u.isOnline,
    status: u.status,
    level: u.level,
  };
}

const Friend = {
  async sendRequest(senderId, receiverId) {
    if (senderId === receiverId) throw Object.assign(new Error('Cannot friend yourself'), { status: 400 });
    return prisma.friendRequest.upsert({
      where: { senderId_receiverId: { senderId: Number(senderId), receiverId: Number(receiverId) } },
      update: { status: 'pending' },
      create: { senderId: Number(senderId), receiverId: Number(receiverId), status: 'pending' },
    });
  },

  async acceptRequest(requestId, receiverId) {
    const request = await prisma.friendRequest.findFirst({
      where: { id: Number(requestId), receiverId: Number(receiverId), status: 'pending' },
    });
    if (!request) throw Object.assign(new Error('Request not found or already handled'), { status: 404 });

    const [updated] = await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: Number(requestId) },
        data: { status: 'accepted' },
      }),
      prisma.friend.createMany({
        data: [
          { userId: request.senderId, friendId: request.receiverId },
          { userId: request.receiverId, friendId: request.senderId },
        ],
        skipDuplicates: true,
      }),
    ]);
    return updated;
  },

  async declineRequest(requestId, receiverId) {
    return prisma.friendRequest.updateMany({
      where: { id: Number(requestId), receiverId: Number(receiverId), status: 'pending' },
      data: { status: 'declined' },
    }).then((r) => (r.count > 0 ? prisma.friendRequest.findUnique({ where: { id: Number(requestId) } }) : null));
  },

  async removeFriend(userId, friendId) {
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: Number(userId), friendId: Number(friendId) },
          { userId: Number(friendId), friendId: Number(userId) },
        ],
      },
    });
  },

  async getFriends(userId, { limit = 50, offset = 0 } = {}) {
    const rows = await prisma.friend.findMany({
      where: { userId: Number(userId) },
      include: { friend: { select: { id: true, username: true, avatar: true, isOnline: true, status: true, level: true } } },
      orderBy: [{ friend: { isOnline: 'desc' } }, { friend: { username: 'asc' } }],
      take: Number(limit),
      skip: Number(offset),
    });
    return rows.map((r) => shapeFriend(r.friend));
  },

  async getOnlineFriends(userId) {
    const rows = await prisma.friend.findMany({
      where: { userId: Number(userId), friend: { isOnline: true } },
      include: { friend: { select: { id: true, username: true, avatar: true, status: true, level: true, isOnline: true } } },
      orderBy: { friend: { username: 'asc' } },
    });
    return rows.map((r) => shapeFriend(r.friend));
  },

  async getPendingReceived(userId) {
    const rows = await prisma.friendRequest.findMany({
      where: { receiverId: Number(userId), status: 'pending' },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, senderUsername: r.sender.username, senderAvatar: r.sender.avatar, sender: undefined }));
  },

  async getPendingSent(userId) {
    const rows = await prisma.friendRequest.findMany({
      where: { senderId: Number(userId), status: 'pending' },
      include: { receiver: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, receiverUsername: r.receiver.username, receiverAvatar: r.receiver.avatar, receiver: undefined }));
  },

  async areFriends(userId, otherUserId) {
    const row = await prisma.friend.findFirst({
      where: { userId: Number(userId), friendId: Number(otherUserId) },
    });
    return !!row;
  },

  async count(userId) {
    return prisma.friend.count({ where: { userId: Number(userId) } });
  },

  async blockUser(userId, blockedUserId) {
    await this.removeFriend(userId, blockedUserId);
    return prisma.blockedUser.upsert({
      where: { userId_blockedUserId: { userId: Number(userId), blockedUserId: Number(blockedUserId) } },
      update: {},
      create: { userId: Number(userId), blockedUserId: Number(blockedUserId) },
    });
  },

  async unblockUser(userId, blockedUserId) {
    await prisma.blockedUser.deleteMany({
      where: { userId: Number(userId), blockedUserId: Number(blockedUserId) },
    });
  },

  async getBlocked(userId) {
    const rows = await prisma.blockedUser.findMany({
      where: { userId: Number(userId) },
      include: { blockedUser: { select: { id: true, username: true, avatar: true } } },
    });
    return rows.map((r) => r.blockedUser);
  },
};

export default Friend;
