import bcrypt from 'bcrypt';
import { loadVaultSecrets } from '../src/config/vault.js';

// Assigned after Vault secrets are loaded so DATABASE_URL is built with real credentials.
let prisma;

const cfg = {
  users: Number(process.env.SEED_USERS || 240),
  posts: Number(process.env.SEED_POSTS || 1400),
  dmMessages: Number(process.env.SEED_DM_MESSAGES || 6000),
  rooms: Number(process.env.SEED_ROOMS || 40),
  roomMessages: Number(process.env.SEED_ROOM_MESSAGES || 7000),
  organizations: Number(process.env.SEED_ORGS || 18),
  notifications: Number(process.env.SEED_NOTIFICATIONS || 2500),
  avgFriends: Number(process.env.SEED_AVG_FRIENDS || 16),
};

const seedPassword = process.env.SEED_PASSWORD || 'LiveSeed123!';
const shouldReset = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';
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
    'alpacas are thriving today',
    'great match in the arena',
    'new upgrade unlocked',
    'party chat is super active',
    'farm economy looks good',
    'friend request accepted',
  ];
  return `${prefix} ${pick(tails)} #${r(100, 9999)}`;
}

async function hardReset() {
  await prisma.$transaction([
    prisma.chatRoomMessage.deleteMany(),
    prisma.chatRoomMember.deleteMany(),
    prisma.chatRoom.deleteMany(),
    prisma.message.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.postLike.deleteMany(),
    prisma.post.deleteMany(),
    prisma.organizationMember.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.friend.deleteMany(),
    prisma.friendRequest.deleteMany(),
    prisma.blockedUser.deleteMany(),
    prisma.game.deleteMany(),
    prisma.gameStat.deleteMany(),
    prisma.userAchievement.deleteMany(),
    prisma.userDailyChallenge.deleteMany(),
    prisma.alpacaFarm.deleteMany(),
    prisma.file.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.dataRequest.deleteMany(),
    prisma.user.deleteMany({ where: { isAdmin: false } }),
  ]);
}

async function seedUsers(passwordHash) {
  const fixedUsers = [
    {
      username: 'live_admin',
      email: 'live_admin@alpacaparty.test',
      passwordHash,
      isAdmin: true,
      isOnline: true,
      level: 20,
      xp: 4200,
      bio: 'Live admin seed account',
      status: 'Managing the alpaca world',
      isPublic: true,
    },
    {
      username: 'live_demo',
      email: 'live_demo@alpacaparty.test',
      passwordHash,
      isOnline: true,
      level: 10,
      xp: 1800,
      bio: 'Demo account for QA',
      status: 'Exploring features',
      isPublic: true,
    },
    {
      username: 'live_mod',
      email: 'live_mod@alpacaparty.test',
      passwordHash,
      isOnline: true,
      level: 14,
      xp: 2600,
      bio: 'Moderator account',
      status: 'Keeping chats tidy',
      isPublic: true,
    },
  ];

  const dynamicCount = Math.max(cfg.users - fixedUsers.length, 0);
  const dynamicUsers = Array.from({ length: dynamicCount }, (_, i) => {
    const idx = i + 1;
    const id = String(idx).padStart(4, '0');
    return {
      username: `live_user_${id}`,
      email: `live_user_${id}@alpacaparty.test`,
      passwordHash,
      isOnline: Math.random() < 0.2,
      level: r(1, 25),
      xp: r(0, 6000),
      bio: `Seeded user ${id}`,
      status: 'Ready to party',
      isPublic: Math.random() < 0.95,
    };
  });

  const allUsers = [...fixedUsers, ...dynamicUsers];
  await prisma.user.createMany({ data: allUsers, skipDuplicates: true });

  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@alpacaparty.test' } },
    select: { id: true, username: true },
    orderBy: { id: 'asc' },
  });

  await prisma.gameStat.createMany({
    data: users.map((u) => ({ userId: u.id, gameType: 'pong', wins: r(0, 30), losses: r(0, 25), draws: r(0, 8), elo: r(850, 1450) })),
    skipDuplicates: true,
  });

  await prisma.alpacaFarm.createMany({
    data: users.map((u) => ({
      userId: u.id,
      farmData: {
        alpacas: Array.from({ length: r(1, 5) }, (_, i) => ({
          id: `${u.id}-${i + 1}`,
          name: `Alpaca_${u.id}_${i + 1}`,
          level: r(1, 8),
        })),
        resources: { gold: r(20, 3000), food: r(10, 2000) },
        level: r(1, 20),
      },
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
    const [a, b] = k.split('-').map(Number);
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
      pendingRequests.push({ senderId, receiverId, status: 'pending' });
    }
  }
  await prisma.friendRequest.createMany({ data: pendingRequests, skipDuplicates: true });

  return pairs;
}

const SEED_IMAGES = [
  'https://images.pexels.com/photos/5840695/pexels-photo-5840695.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',     // fluffy white alpaca close-up
  'https://images.pexels.com/photos/30318570/pexels-photo-30318570/free-photo-of-close-up-portrait-of-a-curious-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // curious brown alpaca portrait
  'https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80',           // group of alpacas grazing on farm
  'https://images.pexels.com/photos/30417713/pexels-photo-30417713/free-photo-of-cute-baby-alpaca-portrait-in-ljubljana-zoo.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // cute baby alpaca close-up
  'https://images.pexels.com/photos/17955330/pexels-photo-17955330/free-photo-of-white-head-of-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // fluffy white alpaca face detail
  'https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80',           // mixed group of alpacas standing in field
  'https://images.pexels.com/photos/17955330/pexels-photo-17955330/free-photo-of-white-head-of-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // another fluffy close-up for variety
  'https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80',           // herd grazing scene
  'https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80',           // alpacas in open field
  'https://images.pexels.com/photos/30318570/pexels-photo-30318570/free-photo-of-close-up-portrait-of-a-curious-alpaca.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // expressive brown alpaca
  'https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80',           // group grazing together
  'https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80',           // colorful mix of alpacas
  'https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80',           // farm herd scene
  'https://images.unsplash.com/photo-1720055703134-0a3bbedd6a19?auto=format&fit=crop&w=600&h=400&q=80',           // alpacas in pasture
  'https://images.pexels.com/photos/30417713/pexels-photo-30417713/free-photo-of-cute-baby-alpaca-portrait-in-ljubljana-zoo.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',  // adorable baby alpaca
  'https://images.unsplash.com/photo-1721495669150-c116779ad34b?auto=format&fit=crop&w=600&h=400&q=80',           // more farm group grazing
];

async function seedPostsAndLikes(userIds) {
  const postsData = Array.from({ length: cfg.posts }, (_, i) => ({
    authorId: pick(userIds),
    content: `${makeContent('Live feed:')} [${runTag}]`,
    imageUrl: (i % 7 === 0) ? pick(SEED_IMAGES) : null,
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
      likesData.push({ postId: post.id, userId: liker, createdAt: randomDateLastDays() });
      likesByPost.set(post.id, (likesByPost.get(post.id) || 0) + 1);
    }
  }

  if (likesData.length) {
    await prisma.postLike.createMany({ data: likesData, skipDuplicates: true });
  }

  for (const [postId, count] of likesByPost.entries()) {
    await prisma.post.update({ where: { id: postId }, data: { likesCount: count } });
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
      content: makeContent('DM:'),
      isRead: Math.random() < 0.7,
      createdAt: randomDateLastDays(),
    };
  });

  await prisma.message.createMany({ data: dms, skipDuplicates: true });
}

async function seedRooms(userIds) {
  const rooms = Array.from({ length: cfg.rooms }, (_, i) => ({
    name: `${runTag}-room-${String(i + 1).padStart(2, '0')}`,
    ownerId: pick(userIds),
    isPrivate: Math.random() < 0.25,
    createdAt: randomDateLastDays(),
  }));

  await prisma.chatRoom.createMany({ data: rooms, skipDuplicates: true });
  const roomRows = await prisma.chatRoom.findMany({
    where: { name: { startsWith: `${runTag}-room-` } },
    select: { id: true, ownerId: true },
  });

  const membersData = [];
  const membersByRoom = new Map();

  for (const room of roomRows) {
    const selected = new Set([room.ownerId]);
    const memberCount = Math.min(userIds.length, r(5, 18));
    while (selected.size < memberCount) {
      selected.add(pick(userIds));
    }

    const memberIds = Array.from(selected);
    membersByRoom.set(room.id, memberIds);

    for (const id of memberIds) {
      membersData.push({ roomId: room.id, userId: id, role: id === room.ownerId ? 'owner' : 'member' });
    }
  }

  await prisma.chatRoomMember.createMany({ data: membersData, skipDuplicates: true });

  const roomMessages = [];
  for (let i = 0; i < cfg.roomMessages; i++) {
    const room = pick(roomRows);
    const members = membersByRoom.get(room.id) || [room.ownerId];
    roomMessages.push({
      roomId: room.id,
      senderId: pick(members),
      content: makeContent('Room:'),
      createdAt: randomDateLastDays(),
    });
  }

  await prisma.chatRoomMessage.createMany({ data: roomMessages, skipDuplicates: true });
}

const ORG_NAMES = [
  'Alpaca Riders Guild', 'Farm Defense League', 'Llama Lords', 'Woolly Warriors',
  'Pong Masters', 'Neon Arena', 'Pixel Farmers Co', 'The Alpaca Academy',
  'Golden Fleece Syndicate', 'Cloud Herders', 'Alpaca Party Official', 'Code Ranchers',
  'Frontier Explorers', 'Turbo Shearers', 'Data Shepherds', 'Midnight Grazers',
  'Alpine Collective', 'Digital Pastures', 'Thunder Herd', 'Cosmic Alpacas',
];

async function seedOrganizations(userIds) {
  const orgsData = Array.from({ length: cfg.organizations }, (_, i) => ({
    name: i < ORG_NAMES.length ? ORG_NAMES[i] : `${ORG_NAMES[i % ORG_NAMES.length]} ${Math.floor(i / ORG_NAMES.length) + 1}`,
    description: pick([
      'A community of dedicated alpaca enthusiasts.',
      'Competitive gaming and strategy discussions.',
      'Casual group for farm management tips.',
      'Elite players pushing the leaderboard.',
      'Social club for events and meetups.',
      'Research and development of alpaca tech.',
    ]),
    ownerId: pick(userIds),
    createdAt: randomDateLastDays(),
    updatedAt: randomDateLastDays(),
  }));

  await prisma.organization.createMany({ data: orgsData, skipDuplicates: true });
  const orgNames = orgsData.map(o => o.name);
  const orgs = await prisma.organization.findMany({
    where: { name: { in: orgNames } },
    select: { id: true, ownerId: true },
  });

  const members = [];
  for (const org of orgs) {
    const selected = new Set([org.ownerId]);
    const count = Math.min(userIds.length, r(8, 30));
    while (selected.size < count) selected.add(pick(userIds));
    for (const id of selected) {
      members.push({ orgId: org.id, userId: id, role: id === org.ownerId ? 'owner' : 'member' });
    }
  }

  await prisma.organizationMember.createMany({ data: members, skipDuplicates: true });
}

async function seedNotifications(userIds) {
  const kinds = ['friend_request', 'friend_accept', 'post_like', 'room_invite', 'system'];
  const data = Array.from({ length: cfg.notifications }, () => ({
    userId: pick(userIds),
    type: pick(kinds),
    title: 'Live notification',
    message: makeContent('Notice:'),
    isRead: Math.random() < 0.75,
    createdAt: randomDateLastDays(),
  }));

  await prisma.notification.createMany({ data, skipDuplicates: true });
}

async function main() {
  await loadVaultSecrets();
  ({ default: prisma } = await import('../src/config/prisma.js'));

  console.log('[seed-live] Starting...');
  console.log('[seed-live] Config:', cfg);

  if (shouldReset) {
    console.log('[seed-live] Reset enabled: clearing non-admin data first');
    await hardReset();
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const users = await seedUsers(passwordHash);
  const userIds = users.map((u) => u.id);

  const friendPairs = await seedSocialGraph(users);
  await Promise.all([
    seedPostsAndLikes(userIds),
    seedMessages(friendPairs),
    seedRooms(userIds),
    seedOrganizations(userIds),
    seedNotifications(userIds),
  ]);

  const [usersCount, postsCount, dmCount, roomsCount, roomMsgCount, orgCount, notifCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.message.count(),
    prisma.chatRoom.count(),
    prisma.chatRoomMessage.count(),
    prisma.organization.count(),
    prisma.notification.count(),
  ]);

  console.log('[seed-live] Done');
  console.log(`[seed-live] users=${usersCount}, posts=${postsCount}, dms=${dmCount}, rooms=${roomsCount}, roomMessages=${roomMsgCount}, orgs=${orgCount}, notifications=${notifCount}`);
  console.log(`[seed-live] Shared password for seeded users: ${seedPassword}`);
  console.log('[seed-live] Demo accounts: live_admin, live_demo, live_mod');
}

main()
  .catch((err) => {
    console.error('[seed-live] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
    process.exit(process.exitCode || 0);
  });
