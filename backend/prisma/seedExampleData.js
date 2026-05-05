import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Secrets are injected via env-cmd from /run/secrets/.env (written by fetchSecrets.js at entrypoint time).
let prisma;

const cfg = {
  users: Number(process.env.SEED_USERS || 2400),
  posts: Number(process.env.SEED_POSTS || 1400),
  dmMessages: Number(process.env.SEED_DM_MESSAGES || 6000),
  rooms: Number(process.env.SEED_ROOMS || 40),
  roomMessages: Number(process.env.SEED_ROOM_MESSAGES || 7000),
  notifications: Number(process.env.SEED_NOTIFICATIONS || 250),
  avgFriends: Number(process.env.SEED_AVG_FRIENDS || 27),
};

const seedPassword = process.env.SEED_PASSWORD || "LiveSeed123!";
const shouldReset =
  process.argv.includes("--reset") || process.env.SEED_RESET === "true";
const runTag = `seed_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

function r(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[r(0, arr.length - 1)];
}

function randomDateLastDays(days = 45) {
  const now = Date.now();
  const delta = r(0, days * 24 * 60 * 60 * 1000);
  return new Date(now - delta);
}

function makeContent(prefix) {
  const tails = [
    "alpacas are thriving today",
    "great match in the arena",
    "new upgrade unlocked",
    "party chat is super active",
    "farm economy looks good",
    "friend request accepted",
  ];
  return `${prefix} ${pick(tails)} #${r(100, 9999)}`;
}

async function hardReset() {
  const resetSteps = [
    ["chatRoomMessage", () => prisma.chatRoomMessage.deleteMany({})],
    ["chatRoomMember", () => prisma.chatRoomMember.deleteMany({})],
    ["chatRoom", () => prisma.chatRoom.deleteMany({})],
    ["message", () => prisma.message.deleteMany({})],
    ["notification", () => prisma.notification.deleteMany({})],
    ["postLike", () => prisma.postLike.deleteMany({})],
    ["post", () => prisma.post.deleteMany({})],
    ["friend", () => prisma.friend.deleteMany({})],
    ["friendRequest", () => prisma.friendRequest.deleteMany({})],
    ["blockedUser", () => prisma.blockedUser.deleteMany({})],
    ["game", () => prisma.game.deleteMany({})],
    ["gameStat", () => prisma.gameStat.deleteMany({})],
    ["userAchievement", () => prisma.userAchievement.deleteMany({})],
    ["userDailyChallenge", () => prisma.userDailyChallenge.deleteMany({})],
    ["alpacaFarm", () => prisma.alpacaFarm.deleteMany({})],
    ["file", () => prisma.file.deleteMany({})],
    ["passwordResetToken", () => prisma.passwordResetToken.deleteMany({})],
    ["dataRequest", () => prisma.dataRequest.deleteMany({})],
    [
      "user",
      () =>
        prisma.user.deleteMany({
          where: {
            OR: [
              { userSettings: { is: null } },
            ],
          },
        }),
    ],
  ];

  for (const [name, op] of resetSteps) {
    try {
      await op();
    } catch (error) {
      console.error(`[seed-live] hardReset failed on ${name}`);
      throw error;
    }
  }
}

async function seedUsers(passwordHash) {
  const fixedUsers = [
    {
      username: "live_admin",
      email: "live_admin@alpacaparty.test",
      passwordHash,
      isOnline: true,
      level: 20,
      xp: 4200,
      bio: "Live admin seed account",
      status: "Managing the alpaca world",
      isPublic: true,
    },
    {
      username: "live_demo",
      email: "live_demo@alpacaparty.test",
      passwordHash,
      isOnline: true,
      level: 10,
      xp: 1800,
      bio: "Demo account for QA",
      status: "Exploring features",
      isPublic: true,
    },
    {
      username: "live_mod",
      email: "live_mod@alpacaparty.test",
      passwordHash,
      isOnline: true,
      level: 14,
      xp: 2600,
      bio: "Moderator account",
      status: "Keeping chats tidy",
      isPublic: true,
    },
  ];

  const dynamicCount = Math.max(cfg.users - fixedUsers.length, 0);
  const dynamicUsers = Array.from({ length: dynamicCount }, (_, i) => {
    const idx = i + 1;
    const id = String(idx).padStart(4, "0");
    return {
      username: `live_user_${id}`,
      email: `live_user_${id}@alpacaparty.test`,
      passwordHash,
      isOnline: Math.random() < 0.2,
      level: r(1, 25),
      xp: r(0, 6000),
      bio: `Seeded user ${id}`,
      status: "Ready to party",
      isPublic: Math.random() < 0.95,
    };
  });

  const allUsers = [...fixedUsers, ...dynamicUsers];
  const users = [];
  for (const entry of allUsers) {
    const { passwordHash, level, xp, isPublic, ...userData } = entry;

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
      select: { id: true, username: true },
    });
    users.push(user);

    await prisma.userAuth.upsert({
      where: { userId: user.id },
      update: { passwordHash },
      create: { userId: user.id, passwordHash },
    });

    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: { level, xp },
      create: { userId: user.id, level, xp },
    });

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { isPublic },
      create: { userId: user.id, isPublic },
    });
  }

  await prisma.gameStat.createMany({
    data: [
      ...users.map((u) => ({
        userId: u.id,
        gameType: "spit_royale",
        wins: r(0, 30),
        losses: r(0, 25),
        draws: r(0, 8),
        elo: r(850, 1450),
      })),
      ...users.map((u) => ({
        userId: u.id,
        gameType: "survival",
        wins: r(0, 20),
        losses: r(0, 30),
        draws: 0,
        elo: r(800, 1400),
      })),
    ],
    skipDuplicates: true,
  });

  await prisma.alpacaFarm.createMany({
    data: users.map((u) => ({
      userId: u.id,
      alpacas: Array.from({ length: r(1, 5) }, (_, i) => ({
        id: `${u.id}-${i + 1}`,
        name: `Alpaca_${u.id}_${i + 1}`,
        level: r(1, 8),
      })),
    })),
    skipDuplicates: true,
  });

  return users;
}

function buildFriendPairs(userIds) {
  const uniquePairs = new Set();
  const desired = Math.floor((userIds.length * cfg.avgFriends) / 2);

  while (uniquePairs.size < desired) {
    const a = pick(userIds);
    const b = pick(userIds);
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    uniquePairs.add(key);
  }

  return Array.from(uniquePairs).map((k) => {
    const [a, b] = k.split("-").map(Number);
    return [a, b];
  });
}

async function seedSocialGraph(users) {
  const userIds = users.map((u) => u.id);
  const pairs = buildFriendPairs(userIds);

  const friendsData = [];
  for (const [a, b] of pairs) {
    friendsData.push({ userId: a, friendId: b });
    friendsData.push({ userId: b, friendId: a });
  }

  await prisma.friend.createMany({ data: friendsData, skipDuplicates: true });

  // Keep a few pending requests for testing workflows.
  const pendingRequests = [];
  for (let i = 0; i < Math.min(80, userIds.length); i++) {
    const senderId = pick(userIds);
    const receiverId = pick(userIds);
    if (senderId !== receiverId) {
      pendingRequests.push({ senderId, receiverId, status: "pending" });
    }
  }
  await prisma.friendRequest.createMany({
    data: pendingRequests,
    skipDuplicates: true,
  });

  return pairs;
}

const SEED_IMAGES = [
  "https://images.pexels.com/photos/5840695/pexels-photo-5840695.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // fluffy white alpaca close-up
  "https://images.pexels.com/photos/30318570/pexels-photo-30318570/free-photo-of-close-up-portrait-of-a-curious-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // curious brown alpaca portrait
  "https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80", // group of alpacas grazing on farm
  "https://images.pexels.com/photos/30417713/pexels-photo-30417713/free-photo-of-cute-baby-alpaca-portrait-in-ljubljana-zoo.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // cute baby alpaca close-up
  "https://images.pexels.com/photos/17955330/pexels-photo-17955330/free-photo-of-white-head-of-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // fluffy white alpaca face detail
  "https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80", // mixed group of alpacas standing in field
  "https://images.pexels.com/photos/17955330/pexels-photo-17955330/free-photo-of-white-head-of-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // another fluffy close-up for variety
  "https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80", // herd grazing scene
  "https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80", // alpacas in open field
  "https://images.pexels.com/photos/30318570/pexels-photo-30318570/free-photo-of-close-up-portrait-of-a-curious-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // expressive brown alpaca
  "https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80", // group grazing together
  "https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80", // colorful mix of alpacas
  "https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80", // farm herd scene
  "https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80", // alpacas in pasture
  "https://images.pexels.com/photos/30417713/pexels-photo-30417713/free-photo-of-cute-baby-alpaca-portrait-in-ljubljana-zoo.jpeg?auto=compress&cs=tinysrgb&w=600&h=400", // adorable baby alpaca
  "https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80", // more farm group grazing
];

async function seedPostsAndLikes(userIds) {
  const postsData = Array.from({ length: cfg.posts }, (_, i) => ({
    authorId: pick(userIds),
    content: `${makeContent("Live feed:")} [${runTag}]`,
    imageUrl: i % 7 === 0 ? pick(SEED_IMAGES) : null,
    isPublic: Math.random() < 0.97,
    createdAt: randomDateLastDays(),
    updatedAt: randomDateLastDays(),
  }));

  await prisma.post.createMany({ data: postsData, skipDuplicates: true });

  const posts = await prisma.post.findMany({
    where: { content: { contains: runTag } },
    select: { id: true, authorId: true },
  });
  const likesData = [];
  const likesByPost = new Map();

  for (const post of posts) {
    const likesCount = r(0, 8);
    const seen = new Set();
    for (let i = 0; i < likesCount; i++) {
      const liker = pick(userIds);
      const key = `${post.id}-${liker}`;
      if (seen.has(key) || liker === post.authorId) continue;
      seen.add(key);
      likesData.push({
        postId: post.id,
        userId: liker,
        createdAt: randomDateLastDays(),
      });
      likesByPost.set(post.id, (likesByPost.get(post.id) || 0) + 1);
    }
  }

  if (likesData.length) {
    await prisma.postLike.createMany({ data: likesData, skipDuplicates: true });
  }

  for (const [postId, count] of likesByPost.entries()) {
    await prisma.post.update({
      where: { id: postId },
      data: { likesCount: count },
    });
  }
}

async function seedMessages(friendPairs) {
  if (!friendPairs.length) return;

  const dms = Array.from({ length: cfg.dmMessages }, () => {
    const [a, b] = pick(friendPairs);
    const senderId = Math.random() < 0.5 ? a : b;
    const receiverId = senderId === a ? b : a;
    return {
      senderId,
      receiverId,
      content: makeContent("DM:"),
      isRead: Math.random() < 0.7,
      createdAt: randomDateLastDays(),
    };
  });

  await prisma.message.createMany({ data: dms, skipDuplicates: true });
}


async function seedNotifications(userIds) {
  const kinds = [
    "friend_request",
    "friend_accept",
    "post_like",
    "room_invite",
    "system",
  ];
  const data = Array.from({ length: cfg.notifications }, () => ({
    userId: pick(userIds),
    type: pick(kinds),
    title: "Live notification",
    message: makeContent("Notice:"),
    isRead: Math.random() < 0.75,
    createdAt: randomDateLastDays(),
  }));

  await prisma.notification.createMany({ data, skipDuplicates: true });
}

async function seedAchievements(userIds) {
  const data = [
    {
      key: "first_login",
      name: "First login",
      description: "You loggend in. Yay",
    },
  ];

  await prisma.achievement.createMany({ data, skipDuplicates: true });
}

async function main() {
  ({ default: prisma } = await import("#lib/prisma.js"));

  console.log("[seed-live] Starting...");
  console.log("[seed-live] Config:", cfg);

  if (shouldReset) {
    console.log("[seed-live] Reset enabled: clearing seeded data first");
    await hardReset();
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const users = await seedUsers(passwordHash);
  const userIds = users.map((u) => u.id);

  const friendPairs = await seedSocialGraph(users);
  await Promise.all([
    seedPostsAndLikes(userIds),
    seedMessages(friendPairs),
    seedNotifications(userIds),
    seedAchievements(userIds),
  ]);

  const [
    usersCount,
    postsCount,
    dmCount,
    roomsCount,
    roomMsgCount,
    notifCount,
    achievementCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.message.count(),
    prisma.chatRoom.count(),
    prisma.chatRoomMessage.count(),
    prisma.notification.count(),
    prisma.achievement.count(),
  ]);

  // Generate API key for live_admin (first fixed user) for E2E testing
  const liveAdmin = users[0]; // live_admin is the first fixed user
  if (liveAdmin && liveAdmin.email === "live_admin@alpacaparty.test") {
    const publicApiSecret = process.env.JWT_PUBLIC_API_SECRET;
    if (publicApiSecret) {
      const apiKey = jwt.sign({ id: liveAdmin.id }, publicApiSecret, {
        expiresIn: "30d",
      });
      await prisma.publicApi.upsert({
        where: { userId: liveAdmin.id },
        update: { apiKey },
        create: { userId: liveAdmin.id, apiKey },
      });
      console.log(`[seed-live] Generated API key for live_admin: ${apiKey}`);
    }
  }

  console.log("[seed-live] Done");
  console.log(
    `[seed-live] users=${usersCount}, posts=${postsCount}, dms=${dmCount}, rooms=${roomsCount}, roomMessages=${roomMsgCount}, notifications=${notifCount}, achievements=${achievementCount}`,
  );
  console.log(`[seed-live] Shared password for seeded users: ${seedPassword}`);
  console.log("[seed-live] Seeded accounts: live_admin, live_demo, live_mod");
}

main()
  .catch((err) => {
    console.error("[seed-live] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
    process.exit(process.exitCode || 0);
  });
