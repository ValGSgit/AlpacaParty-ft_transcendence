import AuthService from "#services/authService.js";
import prisma from "#lib/prisma.js";

/**
 * ### Creates {num} testusers
 */
export const createTestUsers = async (num) => {
  const hash = await AuthService.hashPassword("TestPassword1234");
  for (let i = 0; i < num; i++) {
    await prisma.user.create({
      data: {
        username: `user${i}`,
        email: `user${i}@example.com`,
        avatar: "/avatars/default.svg",
        status: "online",
        bio: "something",
        userAuth: {
          create: {
            passwordHash: hash,
          },
        },
        userStats: {
          create: {
            xp: 10,
            level: 3,
          },
        },
        userSettings: {
          create: {
            isPublic: true,
          },
        },
      },
    });
  }
};
