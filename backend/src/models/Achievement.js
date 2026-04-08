/**
 * Achievement Model — Prisma data access layer (achievements + daily challenges)
 * @owner ValGSgit
 */
import prisma from "#config/prisma.js";

const Achievement = {
  async getAll() {
    return prisma.achievement.findMany({ orderBy: { id: "asc" } });
  },

  async getUserAchievements(userId) {
    const rows = await prisma.userAchievement.findMany({
      where: { userId: Number(userId) },
      include: { achievement: true },
    });
    return rows.map((r) => ({ ...r.achievement, unlockedAt: r.unlockedAt }));
  },

  /**
   * Unlock an achievement for a user.
   * Returns { achievement } if newly unlocked, null if already unlocked or key not found.
   */
  async unlock(userId, achievementKey) {
    const achievement =
      typeof prisma.achievement.findFirst === 'function'
        ? await prisma.achievement.findFirst({ where: { key: achievementKey } })
        : await prisma.achievement.findUnique({ where: { key: achievementKey } });
    if (!achievement) return null;

    if (typeof prisma.userAchievement.createMany === 'function') {
      const created = await prisma.userAchievement.createMany({
        data: [{ userId: Number(userId), achievementId: achievement.id }],
        skipDuplicates: true,
      });
      return created.count > 0 ? { achievement } : null;
    }

    if (typeof prisma.userAchievement.upsert === 'function') {
      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId: Number(userId),
            achievementId: achievement.id,
          },
        },
        update: {},
        create: { userId: Number(userId), achievementId: achievement.id },
      });
      return { achievement };
    }

    await prisma.userAchievement.create({
      data: { userId: Number(userId), achievementId: achievement.id },
    });
    return { achievement };
  },

  async getUserChallengeProgress(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const challenges = await prisma.dailyChallenge.findMany({
      where: { activeDate: { gte: today } },
      include: {
        userChallenges: {
          where: { userId: Number(userId) },
        },
      },
    });

    return challenges.map((c) => ({
      ...c,
      completed: c.userChallenges[0]?.completed ?? false,
      completedAt: c.userChallenges[0]?.completedAt ?? null,
      userChallenges: undefined,
    }));
  },
};

export default Achievement;
