/**
 * Message Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from "#lib/prisma.js";

const Message = {
  async create({ senderId, receiverId, content }) {
    return prisma.message.create({
      data: {
        senderId: Number(senderId),
        receiverId: Number(receiverId),
        content,
      },
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
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return messages.reverse().map((m) => ({
      id: m.id,
      sender_id: m.senderId,
      receiver_id: m.receiverId,
      content: m.content,
      is_read: m.isRead,
      created_at: m.createdAt,
      sender_username: m.sender.username,
      sender_avatar: m.sender.avatar,
    }));
  },

  // DISTINCT ON is PostgreSQL-specific — keep as raw query
  async getConversationsList(userId) {
    return prisma.$queryRaw`
      SELECT DISTINCT ON (other_user_id)
             other_user_id,
             username,
             avatar,
             last_message,
             created_at,
             is_read,
             unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = ${Number(userId)} THEN receiver_id ELSE sender_id END AS other_user_id,
          CASE WHEN sender_id = ${Number(userId)} THEN r.username   ELSE s.username   END AS username,
          CASE WHEN sender_id = ${Number(userId)} THEN r.avatar     ELSE s.avatar     END AS avatar,
          m.content AS last_message,
          m.created_at,
          m.is_read,
          (
            SELECT COUNT(*)::int FROM messages u
            WHERE u.sender_id != ${Number(userId)}
              AND u.receiver_id = ${Number(userId)}
              AND u.is_read = false
              AND u.sender_id = CASE WHEN m.sender_id = ${Number(userId)} THEN m.receiver_id ELSE m.sender_id END
          ) AS unread_count
        FROM messages m
        JOIN users s ON s.id = m.sender_id
        JOIN users r ON r.id = m.receiver_id
        WHERE (m.sender_id = ${Number(userId)} OR m.receiver_id = ${Number(userId)})
          AND m.sender_id != m.receiver_id
      ) sub
      WHERE other_user_id != ${Number(userId)}
      ORDER BY other_user_id, created_at DESC
    `;
  },

  async markAsRead(receiverId, senderId) {
    await prisma.message.updateMany({
      where: {
        receiverId: Number(receiverId),
        senderId: Number(senderId),
        isRead: false,
      },
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
