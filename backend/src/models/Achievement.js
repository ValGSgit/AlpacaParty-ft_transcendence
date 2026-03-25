/**
 * Achievement Model — Prisma data access layer (achievements + daily challenges)
 * @owner ValGSgit
 */
import prisma from "#lib/prisma.js";

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
   * Unlock an achievement for a user. Returns null if already unlocked.
   */
  async unlock(userId, achievementKey) {
    const achievement = prisma.achievement.findFirst({
      where: { key: achievementKey },
    });

    if (!achievement) {
      throw new Error(`Achievement with key ${achievementKey} not found.`);
    }

    return await prisma.userAchievement.create({
      data: {
        userId: userId,
        achievementId: achievement.id,
      },
    });
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
