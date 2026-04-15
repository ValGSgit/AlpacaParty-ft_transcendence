/**
 * User Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from "#config/prisma.js";

// Nested selects for all user sub-relations used across the app.
const SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  status: true,
  isOnline: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
  userAuth:     { select: { oauthProvider: true } },
  userSettings: { select: { isPublic: true, isAdmin: true, apiKey: true } },
  alpacaFarm:   { select: { coins: true, alpacas: true, items: true, upgrades: true } },
};

/**
 * Flatten nested Prisma relations into a single object for API responses.
 * Exposes both camelCase (isAdmin) and snake_case (is_admin) for compatibility.
 */
export function shapeUserForClient(u) {
  if (!u) return u;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    status: u.status,
    is_public: u.userSettings?.isPublic ?? true,
    is_admin: u.userSettings?.isAdmin ?? false,
    isAdmin: u.userSettings?.isAdmin ?? false,
    is_online: u.isOnline,
    isOnline: u.isOnline,
    oauth_provider: u.userAuth?.oauthProvider ?? null,
    api_key:        u.userSettings?.apiKey    ?? null,
    coins:          u.alpacaFarm?.coins       ?? 0,
    alpacas:        u.alpacaFarm?.alpacas     ?? [],
    items:          u.alpacaFarm?.items       ?? [],
    upgrades:       u.alpacaFarm?.upgrades    ?? 0,
    last_seen:      u.lastSeen,
    created_at:     u.createdAt,
    updated_at:     u.updatedAt,
  };
}

const User = {
  async create({ username, email, passwordHash }) {
    return await prisma.user.create({
      data: {
        username,
        email,
        userAuth: { create: { passwordHash } },
        userStats: { create: {} },
        userSettings: { create: {} },
        alpacaFarm: { create: {} },
      },
      select: SAFE_SELECT,
    });
  },

  async findOrCreateOAuth({ provider, oauthId, username, email, avatar }) {
    const existing = await prisma.user.findFirst({
      where: { userAuth: { oauthProvider: provider, oauthId } },
      select: SAFE_SELECT,
    });
    if (existing) return { user: existing, created: false };

    // If we have an email, try to link to an existing local account.
    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          userAuth: {
            upsert: {
              create: { oauthProvider: provider, oauthId },
              update: { oauthProvider: provider, oauthId },
            },
          },
        },
        create: {
          username,
          email,
          avatar: avatar || "/avatars/default.svg",
          userAuth: { create: { oauthProvider: provider, oauthId } },
          userStats: { create: {} },
          userSettings: { create: {} },
          alpacaFarm: { create: {} },
        },
        select: SAFE_SELECT,
      });
      return { user, created: true };
    }

    // No email available (e.g. GitHub user with private email).
    // Generate a unique internal email so the NOT NULL constraint is satisfied.
    const internalEmail = `${provider}_${oauthId}@oauth.internal`;
    const user = await prisma.user.create({
      data: {
        username,
        email: internalEmail,
        avatar: avatar || "/avatars/default.svg",
        userAuth: { create: { oauthProvider: provider, oauthId } },
        userStats: { create: {} },
        userSettings: { create: {} },
        alpacaFarm: { create: {} },
      },
      select: SAFE_SELECT,
    });
    return { user, created: true };
  },

  async findById(id) {
    return prisma.user.findUnique({
      where: { id: Number(id) },
      select: SAFE_SELECT,
    });
  },

  async findByIdWithPassword(id) {
    return prisma.user.findUnique({
      where: { id: Number(id) },
      include: { userAuth: true, userStats: true, userSettings: true },
    });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
      include: { userAuth: true },
    });
  },

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: { userAuth: true },
    });
  },

  async update(id, fields) {
    const userAllowed = ["username", "email", "avatar", "bio", "status"];
    const settingsFields = ["isPublic"];
    const farmFields = ["coins", "alpacas", "items", "upgrades"];

    const userData = {};
    const settingsData = {};
    const farmData = {};

    for (const key of userAllowed) {
      if (fields[key] !== undefined) userData[key] = fields[key];
    }
    for (const key of settingsFields) {
      if (fields[key] !== undefined) settingsData[key] = fields[key];
    }
    for (const key of farmFields) {
      if (fields[key] !== undefined) farmData[key] = fields[key];
    }

    if (
      !Object.keys(userData).length &&
      !Object.keys(settingsData).length &&
      !Object.keys(farmData).length
    ) {
      return this.findById(id);
    }

    const ops = [];
    let updatedUser = null;
    if (Object.keys(userData).length) {
      ops.push(
        prisma.user
          .update({ where: { id: Number(id) }, data: userData })
          .then((u) => {
            updatedUser = u;
            return u;
          }),
      );
    }
    if (Object.keys(settingsData).length) {
      ops.push(
        prisma.userSettings.upsert({
          where: { userId: Number(id) },
          create: { userId: Number(id), ...settingsData },
          update: settingsData,
        }),
      );
    }
    if (Object.keys(farmData).length) {
      ops.push(
        prisma.alpacaFarm.upsert({
          where: { userId: Number(id) },
          create: { userId: Number(id), ...farmData },
          update: farmData,
        }),
      );
    }

    await Promise.all(ops);
    if (updatedUser === null) {
      return null;
    }

    if (
      updatedUser &&
      !Object.keys(settingsData).length &&
      !Object.keys(farmData).length
    ) {
      return updatedUser;
    }
    return this.findById(id);
  },

  async updatePassword(id, passwordHash) {
    await prisma.userAuth.update({
      where: { userId: Number(id) },
      data: { passwordHash },
    });
  },

  async setOnline(id, isOnline = true) {
    await prisma.user.update({
      where: { id: Number(id) },
      data: { isOnline, lastSeen: new Date() },
    });
  },

  async setOffline(id) {
    await prisma.user.update({
      where: { id: Number(id) },
      data: { isOnline: false, lastSeen: new Date() },
    });
  },

<<<<<<< merge(pre-dev)
  async findAll({ limit = 50, offset = 0 } = {}) {
    return prisma.user.findMany({
      select: {
        id: true, username: true, avatar: true, bio: true,
        status: true, isOnline: true, lastSeen: true, createdAt: true,
=======
  async addXp(id, amount) {
    if (!prisma.userStats?.upsert) {
      await prisma.user.update({
        where: { id: Number(id) },
        data: { xp: { increment: amount } },
      });
      return this.findById(id);
    }

    const stats = await prisma.userStats.upsert({
      where: { userId: Number(id) },
      create: { userId: Number(id), xp: amount, level: 1 },
      update: { xp: { increment: amount } },
    });
    const newLevel = Math.max(1, Math.floor(stats.xp / 100) + 1);
    if (newLevel !== stats.level) {
      await prisma.userStats.update({
        where: { userId: Number(id) },
        data: { level: newLevel },
      });
    }
    return this.findById(id);
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        status: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        userStats: { select: { xp: true, level: true } },
>>>>>>> backend
        userSettings: { select: { isPublic: true } },
      },
      orderBy: { createdAt: "desc" },
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
          { username: { startsWith: term, mode: "insensitive" } },
          { bio: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
<<<<<<< merge(pre-dev)
        id: true, username: true, avatar: true, isOnline: true,
=======
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        userStats: { select: { xp: true, level: true } },
>>>>>>> backend
        userSettings: { select: { isPublic: true } },
      },
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

  /** Return the raw apiKey for a user (null if not set). */
  async getApiKey(userId) {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: Number(userId) },
      select: { apiKey: true },
    });
    return settings?.apiKey ?? null;
  },

  /** Upsert an API key for a user. Returns the new key. */
  async setApiKey(userId, key) {
    await prisma.userSettings.upsert({
      where:  { userId: Number(userId) },
      create: { userId: Number(userId), apiKey: key },
      update: { apiKey: key },
    });
    return key;
  },

  /** Remove the API key for a user. */
  async revokeApiKey(userId) {
    await prisma.userSettings.update({
      where: { userId: Number(userId) },
      data:  { apiKey: null },
    });
  },

  /** Validate an API key against the DB. Returns the userId or null. */
  async findByApiKey(key) {
    if (!key) return null;
    const settings = await prisma.userSettings.findUnique({
      where:  { apiKey: key },
      select: { userId: true },
    });
    return settings?.userId ?? null;
  },

  async getFullExport(id) {
    const [user, friends, messages, games, posts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
<<<<<<< merge(pre-dev)
          id: true, username: true, email: true, bio: true,
          status: true, createdAt: true,
=======
          id: true,
          username: true,
          email: true,
          bio: true,
          status: true,
          createdAt: true,
          userStats: { select: { xp: true, level: true } },
>>>>>>> backend
        },
      }),
      prisma.friend.findMany({
        where: { userId: Number(id) },
        include: { friend: { select: { id: true, username: true } } },
      }),
      prisma.message.findMany({
        where: { senderId: Number(id) },
        select: { id: true, receiverId: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.game.findMany({
        where: { OR: [{ player1Id: Number(id) }, { player2Id: Number(id) }] },
        orderBy: { createdAt: "asc" },
      }),
      prisma.post.findMany({
        where: { authorId: Number(id) },
        select: { id: true, content: true, imageUrl: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
<<<<<<< merge(pre-dev)
      user: user ?? null,
      friends: friends.map((f) => ({ friendId: f.friend.id, username: f.friend.username })),
=======
      user: user
        ? {
            ...user,
            xp: user.userStats?.xp ?? 0,
            level: user.userStats?.level ?? 1,
          }
        : null,
      friends: friends.map((f) => ({
        friendId: f.friend.id,
        username: f.friend.username,
      })),
>>>>>>> backend
      messages,
      games,
      posts,
    };
  },
};

export default User;
