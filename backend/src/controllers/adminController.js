/**
 * Admin Controller — site statistics & data management dashboard
 * @owner ValGSgit
 */
import User from "../models/User.js";
import Post from "../models/Post.js";
import Game from "../models/Game.js";
import DataRequest from "../models/DataRequest.js";
import DataExportService from "../services/dataExportService.js";
import NotificationService from "../services/notificationService.js";
import prisma from "#config/prisma.js";

/** GET /api/admin/stats — site-wide statistics */
export const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      onlineUsers,
      totalGames,
      activeGames,
      totalPosts,
      totalMessages,
      totalOrgs,
      pendingRequests,
    ] = await Promise.all([
      User.count(),
      prisma.user.count({ where: { isOnline: true } }),
      prisma.game.count(),
      Game.countActive(),
      Post.count(),
      prisma.message.count(),
      prisma.organization.count(),
      DataRequest.getPending().then((r) => r.length),
    ]);
    res.json({
      stats: {
        totalUsers,
        onlineUsers,
        totalGames,
        activeGames,
        totalPosts,
        totalMessages,
        totalOrgs,
        pendingRequests,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/stats/history?days=30
 *
 * Returns daily time-series counts (user signups, games, posts) for the last
 * N days plus top-N breakdowns for charting in the admin dashboard.
 *
 * Response shape:
 *   {
 *     range: { start, end, days },
 *     series: {
 *       signups:  [{ date: 'YYYY-MM-DD', count }],
 *       games:    [{ date, count }],
 *       posts:    [{ date, count }],
 *       messages: [{ date, count }]
 *     },
 *     top: {
 *       players:       [{ userId, username, elo, wins, losses }],
 *       postAuthors:   [{ authorId, username, postCount }],
 *       organizations: [{ id, name, memberCount }]
 *     }
 *   }
 */
export const getStatsHistory = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);

    const bucketByDay = (rows, field) => {
      const buckets = new Map();
      for (let i = 0; i < days; i += 1) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      for (const row of rows) {
        const ts = row[field];
        if (!ts) continue;
        const key = new Date(ts).toISOString().slice(0, 10);
        if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
      }
      return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
    };

    const [userRows, gameRows, postRows, messageRows, topStats, topAuthors, topOrgs] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.game.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.post.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.message.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.gameStat.findMany({
        where: { gameType: 'spit_royale' },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { elo: 'desc' },
        take: 10,
      }),
      prisma.post.groupBy({
        by: ['authorId'],
        _count: { authorId: true },
        orderBy: { _count: { authorId: 'desc' } },
        take: 10,
      }),
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Resolve author IDs → usernames for the top-authors chart.
    const authorIds = topAuthors.map((r) => r.authorId).filter(Boolean);
    const authors = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, username: true },
        })
      : [];
    const authorById = new Map(authors.map((a) => [a.id, a.username]));

    res.json({
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
      },
      series: {
        signups:  bucketByDay(userRows,    'createdAt'),
        games:    bucketByDay(gameRows,    'createdAt'),
        posts:    bucketByDay(postRows,    'createdAt'),
        messages: bucketByDay(messageRows, 'createdAt'),
      },
      top: {
        players: topStats.map((s) => ({
          userId: s.userId,
          username: s.user?.username ?? null,
          elo: s.elo,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
        })),
        postAuthors: topAuthors.map((r) => ({
          authorId: r.authorId,
          username: authorById.get(r.authorId) ?? null,
          postCount: r._count.authorId,
        })),
        organizations: topOrgs.map((o) => ({
          id: o.id,
          name: o.name,
          memberCount: o._count?.members ?? 0,
        })),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/users?search=&limit=50&offset=0 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const where = search
      ? {
          OR: [
            { username: { startsWith: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          isOnline: true,
          createdAt: true,
          userSettings: { select: { isAdmin: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.user.count({ where }),
    ]);
    // Flatten nested relations for the response
    const shaped = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      isOnline: u.isOnline,
      createdAt: u.createdAt,
      isAdmin:   u.userSettings?.isAdmin ?? false,
    }));
    res.json({ users: shaped, total });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/users/:id */
export const deleteUser = async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res
        .status(400)
        .json({ error: { message: "Cannot delete yourself" } });
    }
    const deleted = await User.deleteById(Number(req.params.id));
    if (!deleted)
      return res.status(404).json({ error: { message: "User not found" } });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/users/:id/toggle-admin */
export const toggleAdmin = async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        username: true,
        userSettings: { select: { isAdmin: true } },
      },
    });
    if (!existing)
      return res.status(404).json({ error: { message: "User not found" } });

    const newAdmin = !(existing.userSettings?.isAdmin ?? false);
    await prisma.userSettings.upsert({
      where: { userId: existing.id },
      create: { userId: existing.id, isAdmin: newAdmin },
      update: { isAdmin: newAdmin },
    });
    res.json({
      user: { id: existing.id, username: existing.username, isAdmin: newAdmin },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/data-requests — GDPR requests queue */
export const listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataRequest.getPending();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/** POST /api/admin/data-requests/:id/process */
export const processDataRequest = async (req, res, next) => {
  try {
    const request = await DataRequest.findById(Number(req.params.id));
    if (!request)
      return res.status(404).json({ error: { message: "Request not found" } });

    await DataRequest.updateStatus(request.id, "processing");

    if (request.type === "export") {
      const { data, extension, contentType } =
        await DataExportService.exportUserData(request.userId, "json");
      // In production, upload to S3 / object store and save URL
      const fileUrl = `/api/admin/data-requests/${request.id}/download`;
      await DataRequest.updateStatus(request.id, "completed", fileUrl);
      await NotificationService.dataRequestCompleted(request.userId, "export");
      res.json({ message: "Export completed", fileUrl });
    } else if (request.type === "delete") {
      await User.deleteById(request.userId);
      await DataRequest.updateStatus(request.id, "completed");
      res.json({ message: "User account deleted" });
    } else {
      res.status(400).json({ error: { message: "Unknown request type" } });
    }
  } catch (err) {
    next(err);
  }
};
