import prisma from "#config/prisma.js";
import AuthService from "../services/authService.js";
import AdminAuthService from "../services/adminAuthService.js";
import Vault from "../lib/vault.js";
import config from "../config/index.js";
import CustomError from "#utils/CustomError.js";

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/login
 * Accepts username (or email) + password. Requires role admin/superadmin.
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw new CustomError("Username and password required", 400);

    let user = await prisma.user.findUnique({
      where: { username },
      include: { userAuth: true },
    });
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: username },
        include: { userAuth: true },
      });
    }
    if (!user || !user.userAuth?.passwordHash) throw new CustomError("Invalid credentials", 401);

    const valid = await AuthService.comparePassword(password, user.userAuth.passwordHash);
    if (!valid) throw new CustomError("Invalid credentials", 401);

    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new CustomError("Insufficient privileges", 403);
    }
    if (user.isBanned) throw new CustomError("Account is banned", 403);

    const token = AdminAuthService.generateToken(user);
    res.cookie("admin_jwt_token", token, config.admin.cookieOptions);
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/logout
 */
export const adminLogout = (_req, res) => {
  res.clearCookie("admin_jwt_token", { path: "/" });
  res.json({ message: "Logged out" });
};

/**
 * GET /api/admin/me
 */
export const getMe = (req, res) => {
  res.json({ admin: req.admin });
};

// ── Dashboard stats ───────────────────────────────────────────────────────────

export const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, bannedUsers, totalPosts, onlineUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.post.count(),
      prisma.user.count({ where: { isOnline: true } }),
    ]);
    res.json({ totalUsers, bannedUsers, totalPosts, onlineUsers });
  } catch (err) {
    next(err);
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      coinAgg,
      topHolders,
      gameTypeCounts,
      totalMatches,
      spitLeaderboard,
      roadLeaderboard,
      recentUsers,
      levelDistribution,
      topAchievements,
      totalXP,
      activeMatches,
    ] = await Promise.all([
      // Coin economy — aggregate
      prisma.alpacaFarm.aggregate({ _sum: { coins: true }, _avg: { coins: true } }),

      // Top 10 coin holders
      prisma.alpacaFarm.findMany({
        orderBy: { coins: 'desc' },
        take: 10,
        select: { coins: true, userId: true, user: { select: { username: true, avatar: true } } },
      }),

      // Game counts & wins grouped by type
      prisma.gameStat.groupBy({
        by: ['gameType'],
        _sum: { wins: true, losses: true },
        _count: { userId: true },
      }),

      // Total matches played
      prisma.gameStat.aggregate({ _sum: { wins: true, losses: true } }),

      // Top 5 Spit Royale ELO
      prisma.gameStat.findMany({
        where: { gameType: 'spit_royale' },
        orderBy: { elo: 'desc' },
        take: 5,
        select: { elo: true, wins: true, userId: true, user: { select: { username: true } } },
      }),

      // Top 5 Alpaca Road ELO
      prisma.gameStat.findMany({
        where: { gameType: 'alpaca_road' },
        orderBy: { elo: 'desc' },
        take: 5,
        select: { elo: true, wins: true, userId: true, user: { select: { username: true } } },
      }),

      // New users per day last 7 days
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Level distribution
      prisma.userStats.groupBy({ by: ['level'], _count: { userId: true }, orderBy: { level: 'asc' } }),

      // Top 8 most unlocked achievements
      prisma.userAchievement.groupBy({
        by: ['achievementId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 8,
      }),

      // Total XP distributed
      prisma.userStats.aggregate({ _sum: { xp: true } }),

      // Active matches (game rows with status playing)
      prisma.gameStat.count({ where: { wins: { gt: 0 } } }),
    ]);

    // Enrich achievement IDs with names
    const achievementIds = topAchievements.map(a => a.achievementId);
    const achievementMeta = await prisma.achievement.findMany({
      where: { id: { in: achievementIds } },
      select: { id: true, key: true, name: true },
    });
    const achById = Object.fromEntries(achievementMeta.map(a => [a.id, a]));

    // Build registrations-per-day map (last 7 days)
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of recentUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (dayMap[key] !== undefined) dayMap[key]++;
    }

    res.json({
      coins: {
        total: coinAgg._sum.coins ?? 0,
        average: Math.round(coinAgg._avg.coins ?? 0),
        topHolders: topHolders.map(f => ({
          userId: f.userId,
          username: f.user.username,
          avatar: f.user.avatar,
          coins: f.coins ?? 0,
        })),
      },
      games: {
        totalWins: totalMatches._sum.wins ?? 0,
        totalLosses: totalMatches._sum.losses ?? 0,
        byType: gameTypeCounts.map(g => ({
          gameType: g.gameType,
          players: g._count.userId,
          wins: g._sum.wins ?? 0,
          losses: g._sum.losses ?? 0,
        })),
        topElo: {
          spit_royale: spitLeaderboard.map(r => ({ userId: r.userId, username: r.user.username, elo: r.elo, wins: r.wins })),
          alpaca_road: roadLeaderboard.map(r => ({ userId: r.userId, username: r.user.username, elo: r.elo, wins: r.wins })),
        },
      },
      users: {
        newThisWeek: recentUsers.length,
        byDay: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
        levelDistribution: levelDistribution.map(l => ({ level: l.level, count: l._count.userId })),
        activeGamers: activeMatches,
        totalXP: totalXP._sum.xp ?? 0,
      },
      achievements: {
        topUnlocked: topAchievements.map(a => ({
          key: achById[a.achievementId]?.key ?? '',
          name: achById[a.achievementId]?.name ?? '',
          count: a._count.userId,
        })),
      },
    });
  } catch (err) { next(err); }
};

// ── User management ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/users?page=1&limit=20&search=
 */
export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search?.trim() || "";

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          isOnline: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: "user" | "admin" | "superadmin" }
 * Only superadmins can grant/revoke admin/superadmin roles.
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    const validRoles = ["user", "admin", "superadmin"];

    if (!validRoles.includes(role)) throw new CustomError("Invalid role", 400);
    if ((role === "admin" || role === "superadmin") && req.admin.role !== "superadmin") {
      throw new CustomError("Only superadmins can grant admin roles", 403);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/ban
 */
export const banUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.admin.id) throw new CustomError("Cannot ban yourself", 400);

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true },
      select: { id: true, username: true, isBanned: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/unban
 */
export const unbanUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: false },
      select: { id: true, username: true, isBanned: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Only superadmins can permanently delete users.
 */
export const deleteUser = async (req, res, next) => {
  try {
    if (req.admin.role !== "superadmin") {
      throw new CustomError("Only superadmins can delete users", 403);
    }
    const id = parseInt(req.params.id, 10);
    if (id === req.admin.id) throw new CustomError("Cannot delete yourself", 400);

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

// ── Per-admin Vault permissions ───────────────────────────────────────────────

/**
 * GET /api/admin/admins/:id/permissions
 */
export const getAdminPermissions = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await Vault.read(`secret/data/alpacaparty/admins/${id}`);
    res.json({ permissions: data ?? {} });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/admins/:id/permissions
 * Body: { permissions: { canBan: true, canDelete: false, ... } }
 */
export const setAdminPermissions = async (req, res, next) => {
  try {
    if (req.admin.role !== "superadmin") {
      throw new CustomError("Only superadmins can set permissions", 403);
    }
    const id = parseInt(req.params.id, 10);
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object") {
      throw new CustomError("permissions object required", 400);
    }
    await Vault.write(`secret/data/alpacaparty/admins/${id}`, permissions);
    res.json({ permissions });
  } catch (err) {
    next(err);
  }
};
