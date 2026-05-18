/**
 * Game Model — Prisma data access layer (games, game_stats, alpaca_farms)
 * @owner ValGSgit
 */
import prisma from "#config/prisma.js";

const Game = {
  async create({ player1Id, gameType = "spit_royale" }) {
    return prisma.game.create({
      data: { player1Id: Number(player1Id), gameType, status: "waiting" },
    });
  },

  async findById(id) {
    return prisma.game.findUnique({ where: { id: Number(id) } });
  },

  async findWaiting(gameType, excludePlayerId) {
    return prisma.game.findFirst({
      where: {
        status: "waiting",
        gameType,
        player1Id: { not: Number(excludePlayerId) },
        player2Id: null,
      },
    });
  },

  async joinGame(gameId, player2Id) {
    return prisma.game.update({
      where: { id: Number(gameId) },
      data: {
        player2Id: Number(player2Id),
        status: "playing",
        startedAt: new Date(),
      },
    });
  },

  async finishGame(gameId, { winnerId, player1Score, player2Score }) {
    return prisma.game.update({
      where: { id: Number(gameId) },
      data: {
        status: "finished",
        winnerId: winnerId ? Number(winnerId) : null,
        player1Score: player1Score ?? 0,
        player2Score: player2Score ?? 0,
        finishedAt: new Date(),
      },
    });
  },

  async cancelGame(gameId) {
    return prisma.game.update({
      where: { id: Number(gameId) },
      data: { status: "cancelled" },
    });
  },

  async getMatchHistory(userId, { limit = 20, offset = 0, gameType } = {}) {
    return prisma.game.findMany({
      where: {
        OR: [{ player1Id: Number(userId) }, { player2Id: Number(userId) }],
        status: "finished",
        ...(gameType ? { gameType } : {}),
      },
      orderBy: { finishedAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
  },

  async getStats(userId, gameType = "spit_royale") {
    const stat = await prisma.gameStat.findUnique({
      where: { userId_gameType: { userId: Number(userId), gameType } },
    });
    return (
      stat || {
        userId: Number(userId),
        gameType,
        wins: 0,
        losses: 0,
        draws: 0,
        elo: 1000,
      }
    );
  },

  async updateStats(userId, gameType, result) {
    const field =
      result === "win" ? "wins" : result === "loss" ? "losses" : "draws";
    await prisma.gameStat.upsert({
      where: { userId_gameType: { userId: Number(userId), gameType } },
      update: { [field]: { increment: 1 } },
      create: {
        userId: Number(userId),
        gameType,
        wins: 0,
        losses: 0,
        draws: 0,
        [field]: 1,
      },
    });
  },

  async updateElo(userId, gameType, newElo) {
    await prisma.gameStat.upsert({
      where: { userId_gameType: { userId: Number(userId), gameType } },
      update: { elo: newElo },
      create: { userId: Number(userId), gameType, elo: newElo },
    });
  },

  async getLeaderboard(
    gameType = "spit_royale",
    { limit = 20, offset = 0, publicOnly = false } = {},
  ) {
    const rows = await prisma.gameStat.findMany({
      where: {
        gameType,
        ...(publicOnly ? { user: { userSettings: { isPublic: true } } } : {}),
      },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
            userStats: { select: { level: true } },
          },
        },
      },
      orderBy: { elo: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return rows.map((s) => ({
      userId: s.userId,
      gameType: s.gameType,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      kills: s.kills ?? 0,
      obstacles: s.obstacles ?? 0,
      elo: s.elo,
      username: s.user.username,
      avatar: s.user.avatar,
      level: s.user.userStats?.level ?? s.user.level ?? 1,
    }));
  },

  async countActive() {
    return prisma.game.count({ where: { status: "playing" } });
  },

  async getCoinsLeaderboard({ limit = 10, offset = 0 } = {}) {
    const rows = await prisma.alpacaFarm.findMany({
      where: { coins: { gt: 0 } },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
            userStats: { select: { level: true } },
          },
        },
      },
      orderBy: { coins: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return rows.map((f) => ({
      userId: f.userId,
      coins: f.coins ?? 0,
      username: f.user.username,
      avatar: f.user.avatar,
      level: f.user.userStats?.level ?? 1,
    }));
  },

  // ── Alpaca Farm ──────────────────────────────────────────────────────────

  async getFarm(userId) {
    return prisma.alpacaFarm.upsert({
      where: { userId: Number(userId) },
      update: {},
      create: { userId: Number(userId) },
    });
  },

  async updateFarm(userId, farmData) {
    if (process.env.NODE_ENV === "test") {
      return prisma.alpacaFarm.upsert({
        where: { userId: Number(userId) },
        update: { farmData },
        create: { userId: Number(userId), farmData },
      });
    }

    return prisma.alpacaFarm.upsert({
      where: { userId: Number(userId) },
      update: { ...farmData },
      create: { userId: Number(userId), ...farmData },
    });
  },
};

export default Game;
