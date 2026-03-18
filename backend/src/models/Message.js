/**
 * Message Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

const Message = {
  async create({ senderId, receiverId, content }) {
    return prisma.message.create({
      data: { senderId: Number(senderId), receiverId: Number(receiverId), content },
    });
  },

  async getConversation(userId, otherUserId, { limit = 50, offset = 0 } = {}) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: Number(userId), receiverId: Number(otherUserId) },
          { senderId: Number(otherUserId), receiverId: Number(userId) },
        ],
      },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
    return messages
      .reverse()
      .map((m) => ({ ...m, senderUsername: m.sender.username, senderAvatar: m.sender.avatar, sender: undefined }));
  },

  // DISTINCT ON is PostgreSQL-specific — keep as raw query
  async getConversationsList(userId) {
    return prisma.$queryRaw`
      SELECT DISTINCT ON (partner_id)
             partner_id,
             partner_username,
             partner_avatar,
             content,
             created_at,
             is_read
      FROM (
        SELECT
          CASE WHEN sender_id = ${Number(userId)} THEN receiver_id ELSE sender_id END AS partner_id,
          CASE WHEN sender_id = ${Number(userId)} THEN r.username   ELSE s.username   END AS partner_username,
          CASE WHEN sender_id = ${Number(userId)} THEN r.avatar     ELSE s.avatar     END AS partner_avatar,
          m.content,
          m.created_at,
          m.is_read
        FROM messages m
        JOIN users s ON s.id = m.sender_id
        JOIN users r ON r.id = m.receiver_id
        WHERE m.sender_id = ${Number(userId)} OR m.receiver_id = ${Number(userId)}
      ) sub
      ORDER BY partner_id, created_at DESC
    `;
  },

  async markAsRead(receiverId, senderId) {
    await prisma.message.updateMany({
      where: { receiverId: Number(receiverId), senderId: Number(senderId), isRead: false },
      data: { isRead: true },
    });
  },

  async countUnread(userId) {
    return prisma.message.count({
      where: { receiverId: Number(userId), isRead: false },
    });
  },
};

export default Message;
