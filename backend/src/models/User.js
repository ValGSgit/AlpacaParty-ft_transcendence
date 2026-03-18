/**
 * User Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

// Fields returned for normal (safe) user queries — no password/2FA secrets
const SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  alpacas: true,
  items: true,
  coins: true,
  upgrades: true,
  status: true,
  isPublic: true,
  isOnline: true,
  isAdmin: true,
  oauthProvider: true,
  xp: true,
  level: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
};

const User = {
  async create({ username, email, passwordHash }) {
    return prisma.user.create({
      data: { username, email, passwordHash },
      select: SAFE_SELECT,
    });
  },

  async findOrCreateOAuth({ provider, oauthId, username, email, avatar }) {
    const existing = await prisma.user.findUnique({
      where: { idx_users_oauth: { oauthProvider: provider, oauthId } },
      select: SAFE_SELECT,
    });
    if (existing) return { user: existing, created: false };

    // Upsert: if email already exists (local account), link OAuth
    const user = await prisma.user.upsert({
      where: { email },
      update: { oauthProvider: provider, oauthId },
      create: {
        username,
        email,
        oauthProvider: provider,
        oauthId,
        avatar: avatar || '/avatars/default.svg',
        passwordHash: '',
      },
      select: SAFE_SELECT,
    });
    return { user, created: true };
  },

  async findById(id) {
    return prisma.user.findUnique({ where: { id: Number(id) }, select: SAFE_SELECT });
  },

  async findByIdWithPassword(id) {
    return prisma.user.findUnique({ where: { id: Number(id) } });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  async update(id, fields) {
    const allowed = ['username', 'email', 'avatar', 'bio', 'status', 'coins', 'isPublic', 'alpacas', 'items', 'upgrades'];
    const data = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) data[key] = fields[key];
    }
    if (Object.keys(data).length === 0) return this.findById(id);
    return prisma.user.update({ where: { id: Number(id) }, data, select: SAFE_SELECT });
  },

  async updatePassword(id, passwordHash) {
    await prisma.user.update({ where: { id: Number(id) }, data: { passwordHash } });
  },

  async setOnline(id, isOnline) {
    await prisma.user.update({
      where: { id: Number(id) },
      data: { isOnline, lastSeen: new Date() },
    });
  },

  async addXp(id, amount) {
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { xp: { increment: amount } },
      select: { id: true, xp: true, level: true },
    });
    const newLevel = Math.max(1, Math.floor(updated.xp / 100) + 1);
    if (newLevel !== updated.level) {
      return prisma.user.update({
        where: { id: Number(id) },
        data: { level: newLevel },
        select: SAFE_SELECT,
      });
    }
    return this.findById(id);
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    return prisma.user.findMany({
      select: {
        id: true, username: true, avatar: true, bio: true,
        status: true, isPublic: true, isOnline: true, xp: true,
        level: true, lastSeen: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  },

  async count() {
    return prisma.user.count();
  },

  async search(term, { limit = 20, offset = 0 } = {}) {
    return prisma.user.findMany({
      where: {
        OR: [
          { username: { startsWith: term, mode: 'insensitive' } },
          { bio: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, avatar: true, isOnline: true, xp: true, level: true, isPublic: true },
      take: Number(limit),
      skip: Number(offset),
    });
  },

  async deleteById(id) {
    try {
      await prisma.user.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },

  async getFullExport(id) {
    const [user, friends, messages, games, posts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: Number(id) },
        select: { id: true, username: true, email: true, bio: true, status: true, xp: true, level: true, createdAt: true },
      }),
      prisma.friend.findMany({
        where: { userId: Number(id) },
        include: { friend: { select: { id: true, username: true } } },
      }),
      prisma.message.findMany({
        where: { senderId: Number(id) },
        select: { id: true, receiverId: true, content: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.game.findMany({
        where: { OR: [{ player1Id: Number(id) }, { player2Id: Number(id) }] },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.post.findMany({
        where: { authorId: Number(id) },
        select: { id: true, content: true, imageUrl: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      user,
      friends: friends.map((f) => ({ friendId: f.friend.id, username: f.friend.username })),
      messages,
      games,
      posts,
    };
  },
};

export default User;
