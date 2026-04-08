import prisma from "#config/prisma.js";

export const unlockAchievement = async (achievementKey, userId) => {
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
};
