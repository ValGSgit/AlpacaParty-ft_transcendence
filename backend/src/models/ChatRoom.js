/**
 * ChatRoom Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from "#config/prisma.js";

const ChatRoom = {
  async create({ name, ownerId, isPrivate = false }) {
    return prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: { name, ownerId: Number(ownerId), isPrivate },
      });
      await tx.chatRoomMember.create({
        data: { roomId: room.id, userId: Number(ownerId), role: "owner" },
      });
      return {
        id: room.id,
        name: room.name,
        owner_id: room.ownerId,
        is_private: room.isPrivate,
        created_at: room.createdAt,
      };
    });
  },

  async findById(id) {
    return prisma.chatRoom.findUnique({ where: { id: Number(id) } });
  },

  async getUserRooms(userId) {
    const memberships = await prisma.chatRoomMember.findMany({
      where: { userId: Number(userId) },
      include: { room: true },
    });
    return memberships.map((m) => ({
      id: m.room.id,
      name: m.room.name,
      owner_id: m.room.ownerId,
      is_private: m.room.isPrivate,
      created_at: m.room.createdAt,
      role: m.role,
    }));
  },

  async isMember(roomId, userId) {
    const row = await prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: { roomId: Number(roomId), userId: Number(userId) },
      },
    });
    return !!row;
  },

  async addMember(roomId, userId, role = "member") {
    return prisma.chatRoomMember.upsert({
      where: {
        roomId_userId: { roomId: Number(roomId), userId: Number(userId) },
      },
      update: {},
      create: { roomId: Number(roomId), userId: Number(userId), role },
    });
  },

  async removeMember(roomId, userId) {
    await prisma.chatRoomMember.deleteMany({
      where: { roomId: Number(roomId), userId: Number(userId) },
    });
  },

  async getMessages(roomId, { limit = 50, offset = 0 } = {}) {
    const messages = await prisma.chatRoomMessage.findMany({
      where: { roomId: Number(roomId) },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return messages.reverse().map((m) => ({
      id: m.id,
      room_id: m.roomId,
      sender_id: m.senderId,
      content: m.content,
      created_at: m.createdAt,
      sender_username: m.sender.username,
      sender_avatar: m.sender.avatar,
    }));
  },

  async sendMessage({ roomId, senderId, content }) {
    return prisma.chatRoomMessage.create({
      data: { roomId: Number(roomId), senderId: Number(senderId), content },
    });
  },

  async delete(id) {
    await prisma.chatRoom.delete({ where: { id: Number(id) } });
  },
};

export default ChatRoom;
