/**
 * Notification Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

const Notification = {
  async create({ userId, type, title, message, referenceType, referenceId }) {
    return prisma.notification.create({
      data: {
        userId: Number(userId),
        type,
        title: title || '',
        message,
        referenceType: referenceType || null,
        referenceId: referenceId ? Number(referenceId) : null,
      },
    });
  },

  async getForUser(userId, { limit = 30, offset = 0, unreadOnly = false } = {}) {
    return prisma.notification.findMany({
      where: { userId: Number(userId), ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  },

  async markRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id: Number(id), userId: Number(userId) },
      data: { isRead: true },
    }).then((r) => (r.count > 0 ? prisma.notification.findUnique({ where: { id: Number(id) } }) : null));
  },

  async markAllRead(userId) {
    await prisma.notification.updateMany({
      where: { userId: Number(userId), isRead: false },
      data: { isRead: true },
    });
  },

  async countUnread(userId) {
    return prisma.notification.count({ where: { userId: Number(userId), isRead: false } });
  },

  async delete(id, userId) {
    const { count } = await prisma.notification.deleteMany({
      where: { id: Number(id), userId: Number(userId) },
    });
    return count > 0;
  },
};

export default Notification;
