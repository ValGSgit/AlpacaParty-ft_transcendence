import AuthService from "#services/authService.js";
import prisma from "#config/prisma.js";

/**
 * ### Creates {num} testusers
 */
export const createTestUsers = async (num) => {
  // console.log(`createTestUsers: ${num}`);
  const hash = await AuthService.hashPassword("TestPassword1234");
  const runTag = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const createdUsers = [];
  for (let i = 0; i < num; i++) {
    const user = await prisma.user.create({
      data: {
        username: `user${i}_${runTag}`,
        email: `user${i}_${runTag}@example.com`,
        avatar: "/avatars/default.svg",
        status: "user status",
        isOnline: i % 2 ? true : false,
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

    createdUsers.push({
      id: user.id,
      username: user.username,
    });
  }
  return createdUsers;
};
