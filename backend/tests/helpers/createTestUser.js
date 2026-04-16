import AuthService from "#services/authService.js";
import prisma from "#config/prisma.js";

/**
 * ### Creates one test user with default params or override them
 */
export async function createTestUser(name, overrides = {}) {
  const hash = await AuthService.hashPassword("TestPassword1234");

  const defaultData = {
    username: `user_${name}`,
    email: `user_${name}@example.com`,
    avatar: "/avatars/default.svg",
    status: "user status",
    isOnline: false,
    bio: "something",
    userAuth: {
      create: { passwordHash: hash },
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
  };

  const userData = { ...defaultData, ...overrides };

  const user = await prisma.user.create({
    data: userData,
  });

  return user;
}
