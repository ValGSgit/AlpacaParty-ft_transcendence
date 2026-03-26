-- ==========================================================================
-- Seed Data Script — Simulates a live AlpacaParty application
-- @description  Generates 200 users, friends, messages, posts, groups, games, etc.
-- @usage        docker exec -i alpacaparty_db psql -U alpaca -d alpacaparty_db < scripts/seed-data.sql
--               OR: make seed-data
--
-- NOTE: All seeded users share the password "TestPass1"
--       The bcrypt hash below is for "TestPass1" with 12 salt rounds.
-- ==========================================================================

-- Use a single transaction for atomicity
BEGIN;

-- ── Pre-computed bcrypt hash for "TestPass1" ──────────────────────────────
-- Generated with: await bcrypt.hash('TestPass1', 12)
DO $$ DECLARE pw_hash TEXT := '$2b$12$LJ3m4ys3LzQVKoEBOBMxnOxQzUKBCfJBQ3.DYcFqB.qnGEjSqZYSy'; BEGIN

-- ══════════════════════════════════════════════════════════════════════════
-- 1. USERS (200 users)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO users (username, email, password_hash, avatar, bio, status, is_public, is_online, is_admin, xp, level, coins, upgrades, created_at)
SELECT
  'user_' || i,
  'user_' || i || '@alpacaparty.test',
  pw_hash,
  '/avatars/default.svg',
  CASE (i % 10)
    WHEN 0 THEN 'Alpaca enthusiast and casual gamer'
    WHEN 1 THEN 'Love playing Spit Royale and collecting alpacas!'
    WHEN 2 THEN 'Just here to have fun with friends'
    WHEN 3 THEN 'Competitive Spit Royale player - watch out!'
    WHEN 4 THEN 'Building the best alpaca farm ever'
    WHEN 5 THEN 'New to AlpacaParty, say hi!'
    WHEN 6 THEN 'Longtime member, always online'
    WHEN 7 THEN 'Alpaca breeder and Spit Royale champion'
    WHEN 8 THEN 'Looking for friends to play with'
    ELSE 'Hey there! I am using AlpacaParty'
  END,
  CASE (i % 6)
    WHEN 0 THEN 'Online and ready to play!'
    WHEN 1 THEN 'Busy farming alpacas'
    WHEN 2 THEN 'Away'
    WHEN 3 THEN 'In a Spit Royale match'
    WHEN 4 THEN 'Chilling'
    ELSE 'Hey there! I am using AlpacaParty'
  END,
  CASE WHEN i % 7 = 0 THEN FALSE ELSE TRUE END,     -- ~14% private profiles
  CASE WHEN i % 5 = 0 THEN TRUE ELSE FALSE END,      -- ~20% online
  CASE WHEN i <= 3 THEN TRUE ELSE FALSE END,          -- first 3 are admins
  (i * 47 + (i % 13) * 100) % 5000,                   -- varied XP (0-5000)
  LEAST(1 + ((i * 47 + (i % 13) * 100) % 5000) / 500, 10), -- level 1-10
  10 + (i * 7) % 500,                                  -- coins 10-509
  (i % 5),                                             -- upgrades 0-4
  NOW() - (interval '1 day' * (200 - i))               -- staggered join dates
FROM generate_series(1, 200) AS i
ON CONFLICT (username) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. FRIEND REQUESTS (300 accepted + 50 pending + 20 declined)
-- ══════════════════════════════════════════════════════════════════════════

-- Accepted friend requests (will create friend pairs)
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at)
SELECT
  s, r, 'accepted',
  NOW() - (interval '1 hour' * (370 - i)),
  NOW() - (interval '1 hour' * (370 - i)) + interval '30 minutes'
FROM (
  SELECT ROW_NUMBER() OVER () AS i, s, r FROM (
    SELECT
      ((i - 1) % 200) + 1 AS s,
      (((i - 1) * 7 + 3) % 200) + 1 AS r
    FROM generate_series(1, 400) AS i
  ) sub WHERE s <> r
  LIMIT 300
) pairs
ON CONFLICT (sender_id, receiver_id) DO NOTHING;

-- Pending friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at)
SELECT
  ((i * 3 + 50) % 200) + 1,
  ((i * 3 + 120) % 200) + 1,
  'pending',
  NOW() - (interval '1 hour' * i)
FROM generate_series(1, 50) AS i
WHERE ((i * 3 + 50) % 200) + 1 <> ((i * 3 + 120) % 200) + 1
ON CONFLICT (sender_id, receiver_id) DO NOTHING;

-- Declined friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at)
SELECT
  ((i * 11 + 80) % 200) + 1,
  ((i * 11 + 150) % 200) + 1,
  'declined',
  NOW() - (interval '1 day' * i),
  NOW() - (interval '1 day' * i) + interval '2 hours'
FROM generate_series(1, 20) AS i
WHERE ((i * 11 + 80) % 200) + 1 <> ((i * 11 + 150) % 200) + 1
ON CONFLICT (sender_id, receiver_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. FRIENDS (mutual pairs from accepted requests)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO friends (user_id, friend_id, created_at)
SELECT sender_id, receiver_id, updated_at
FROM friend_requests WHERE status = 'accepted'
ON CONFLICT (user_id, friend_id) DO NOTHING;

INSERT INTO friends (user_id, friend_id, created_at)
SELECT receiver_id, sender_id, updated_at
FROM friend_requests WHERE status = 'accepted'
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 4. BLOCKED USERS (30 blocks)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO blocked_users (user_id, blocked_user_id)
SELECT
  ((i * 13 + 1) % 200) + 1,
  ((i * 13 + 100) % 200) + 1
FROM generate_series(1, 30) AS i
WHERE ((i * 13 + 1) % 200) + 1 <> ((i * 13 + 100) % 200) + 1
ON CONFLICT (user_id, blocked_user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 5. DIRECT MESSAGES (2000 messages across friend pairs)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at)
SELECT
  CASE WHEN i % 2 = 0 THEN f.user_id ELSE f.friend_id END,
  CASE WHEN i % 2 = 0 THEN f.friend_id ELSE f.user_id END,
  CASE (i % 20)
    WHEN 0 THEN 'Hey! Want to play a game of Spit Royale?'
    WHEN 1 THEN 'Sure, let me finish farming first'
    WHEN 2 THEN 'Good game! That was close'
    WHEN 3 THEN 'Have you seen the new alpaca skins?'
    WHEN 4 THEN 'I just reached level ' || (1 + i % 10) || '!'
    WHEN 5 THEN 'Check out my farm, I got a rare alpaca!'
    WHEN 6 THEN 'Thanks for the friend request!'
    WHEN 7 THEN 'Are you online later tonight?'
    WHEN 8 THEN 'Just posted something on the feed, check it out'
    WHEN 9 THEN 'I need help with the daily challenge'
    WHEN 10 THEN 'My elo is ' || (900 + i % 400) || ' now!'
    WHEN 11 THEN 'Want to join our organization?'
    WHEN 12 THEN 'Nice profile pic!'
    WHEN 13 THEN 'How do you get so many coins?'
    WHEN 14 THEN 'The help desk AI is actually pretty useful'
    WHEN 15 THEN 'lol that was a funny match'
    WHEN 16 THEN 'brb, need to feed my alpacas'
    WHEN 17 THEN 'I unlocked the On Fire achievement!'
    WHEN 18 THEN 'Let me know when you want to rematch'
    ELSE 'Hey! How are you?'
  END,
  CASE WHEN i % 3 = 0 THEN FALSE ELSE TRUE END,     -- ~33% unread
  NOW() - (interval '1 minute' * (2000 - i))
FROM generate_series(1, 2000) AS i
CROSS JOIN LATERAL (
  SELECT user_id, friend_id
  FROM friends
  OFFSET ((i - 1) % (SELECT COUNT(*) FROM friends))
  LIMIT 1
) f;

-- ══════════════════════════════════════════════════════════════════════════
-- 6. CHAT ROOMS (25 group chats)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO chat_rooms (name, owner_id, is_private, created_at)
SELECT
  CASE (i % 25)
    WHEN 0 THEN 'General Chat'
    WHEN 1 THEN 'Spit Royale Champions'
    WHEN 2 THEN 'Alpaca Breeders Club'
    WHEN 3 THEN 'Newbie Welcome'
    WHEN 4 THEN 'Strategy Discussion'
    WHEN 5 THEN 'Meme Corner'
    WHEN 6 THEN 'Trade Alpacas'
    WHEN 7 THEN 'Daily Challenge Help'
    WHEN 8 THEN 'Tournament Lobby'
    WHEN 9 THEN 'Off Topic'
    WHEN 10 THEN 'Bug Reports'
    WHEN 11 THEN 'Feature Requests'
    WHEN 12 THEN 'European Players'
    WHEN 13 THEN 'Night Owls'
    WHEN 14 THEN 'Speed Spit League'
    WHEN 15 THEN 'Alpaca Farm Tips'
    WHEN 16 THEN 'Achievement Hunters'
    WHEN 17 THEN 'Casual Games'
    WHEN 18 THEN 'Competitive Ladder'
    WHEN 19 THEN 'Art & Creativity'
    WHEN 20 THEN 'Music Lovers'
    WHEN 21 THEN 'Study Group'
    WHEN 22 THEN 'Admin Lounge'
    WHEN 23 THEN 'VIP Room'
    ELSE 'Hangout Zone'
  END,
  (i % 200) + 1,                                      -- owner cycles through users
  CASE WHEN i IN (22, 23) THEN TRUE ELSE FALSE END,   -- Admin Lounge & VIP are private
  NOW() - (interval '1 day' * (25 - i))
FROM generate_series(0, 24) AS i;

-- ── Chat Room Members (5-15 members per room) ────────────────────────────

INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT
  r.id,
  r.owner_id,
  'owner',
  r.created_at
FROM chat_rooms r
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Add 5-14 additional members per room
INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT
  r.id,
  ((r.id * 7 + m) % 200) + 1,
  CASE WHEN m <= 2 THEN 'admin' ELSE 'member' END,
  r.created_at + (interval '1 hour' * m)
FROM chat_rooms r
CROSS JOIN generate_series(1, 14) AS m
WHERE ((r.id * 7 + m) % 200) + 1 <> r.owner_id
  AND m <= 5 + (r.id % 10)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- ── Chat Room Messages (1500 messages across rooms) ──────────────────────

INSERT INTO chat_room_messages (room_id, sender_id, content, created_at)
SELECT
  cm.room_id,
  cm.user_id,
  CASE (i % 15)
    WHEN 0 THEN 'Hey everyone!'
    WHEN 1 THEN 'Anyone up for a game?'
    WHEN 2 THEN 'Just unlocked a new achievement!'
    WHEN 3 THEN 'Check out the leaderboard, I climbed 5 spots!'
    WHEN 4 THEN 'What is the best strategy for Spit Royale?'
    WHEN 5 THEN 'My alpaca farm is looking great'
    WHEN 6 THEN 'Has anyone completed today''s challenge?'
    WHEN 7 THEN 'Good morning everyone!'
    WHEN 8 THEN 'That last tournament was amazing'
    WHEN 9 THEN 'I think the matchmaking is really good'
    WHEN 10 THEN 'lol nice one'
    WHEN 11 THEN 'Welcome to the group!'
    WHEN 12 THEN 'Don''t forget to check the daily challenges'
    WHEN 13 THEN 'My elo just hit a new high!'
    ELSE 'Great community here!'
  END,
  NOW() - (interval '1 minute' * (1500 - i))
FROM generate_series(1, 1500) AS i
CROSS JOIN LATERAL (
  SELECT room_id, user_id
  FROM chat_room_members
  OFFSET ((i - 1) % (SELECT COUNT(*) FROM chat_room_members))
  LIMIT 1
) cm;

-- ══════════════════════════════════════════════════════════════════════════
-- 7. POSTS (500 posts with varied content)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO posts (author_id, content, image_url, is_public, likes_count, created_at, updated_at)
SELECT
  (i % 200) + 1,
  CASE (i % 25)
    WHEN 0 THEN 'Just reached a new high score in Spit Royale! Who wants to challenge me?'
    WHEN 1 THEN 'My alpaca farm is thriving! 🦙 Level ' || (1 + i % 10) || ' and counting!'
    WHEN 2 THEN 'Tips for new players: always warm up with daily challenges first'
    WHEN 3 THEN 'Looking for members for our organization. DM me if interested!'
    WHEN 4 THEN 'The new update is amazing! Love the improved matchmaking'
    WHEN 5 THEN 'Finally unlocked the On Fire achievement after 5 wins in a row!'
    WHEN 6 THEN 'Rate my alpaca farm setup! Been working on it all week'
    WHEN 7 THEN 'GG to everyone in tonight''s tournament. Great matches all around!'
    WHEN 8 THEN 'Does anyone know the best way to earn coins quickly?'
    WHEN 9 THEN 'Sharing my Spit Royale strategy guide for beginners'
    WHEN 10 THEN 'Just joined AlpacaParty and I''m already hooked!'
    WHEN 11 THEN 'Shoutout to the help desk AI - helped me figure out the game settings'
    WHEN 12 THEN 'My friend and I have been playing for hours. Such a fun game!'
    WHEN 13 THEN 'Reached level 10 today! Veteran achievement unlocked!'
    WHEN 14 THEN 'The community here is so welcoming. Thanks everyone!'
    WHEN 15 THEN 'Working on getting 10 friends for the Social Butterfly badge'
    WHEN 16 THEN 'Late night Spit Royale sessions are the best'
    WHEN 17 THEN 'Just founded a new organization - Alpaca Legends!'
    WHEN 18 THEN 'Daily challenge completed! That XP bonus is nice'
    WHEN 19 THEN 'Anyone else collecting rare alpaca skins?'
    WHEN 20 THEN 'Proud of my ' || (1000 + i % 500) || ' ELO rating!'
    WHEN 21 THEN 'The API documentation is really well done'
    WHEN 22 THEN 'Weekend gaming session starting now! Join the General Chat room'
    WHEN 23 THEN 'Thanks for all the friend requests! I''ll accept them all'
    ELSE 'Having a great time on AlpacaParty! Best platform ever!'
  END,
  CASE WHEN i % 8 = 0 THEN '/uploads/post_' || i || '.jpg' ELSE NULL END,  -- ~12.5% have images
  CASE WHEN i % 12 = 0 THEN FALSE ELSE TRUE END,                            -- ~8% private
  0,  -- likes_count will be updated by post_likes
  NOW() - (interval '30 minutes' * (500 - i)),
  NOW() - (interval '30 minutes' * (500 - i))
FROM generate_series(1, 500) AS i;

-- ══════════════════════════════════════════════════════════════════════════
-- 8. POST LIKES (2000 likes across posts)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO post_likes (post_id, user_id, created_at)
SELECT
  ((i - 1) % (SELECT COUNT(*) FROM posts)) + (SELECT MIN(id) FROM posts),
  ((i * 7 + 3) % 200) + 1,
  NOW() - (interval '1 minute' * (2000 - i))
FROM generate_series(1, 2000) AS i
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Update likes_count on posts
UPDATE posts SET likes_count = sub.cnt
FROM (
  SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
) sub
WHERE posts.id = sub.post_id;

-- ══════════════════════════════════════════════════════════════════════════
-- 9. ORGANIZATIONS (20 organizations)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO organizations (name, description, avatar, owner_id, created_at, updated_at)
SELECT
  org_name,
  org_desc,
  '/avatars/default-org.svg',
  owner,
  NOW() - (interval '1 day' * (20 - i)),
  NOW() - (interval '1 day' * (20 - i))
FROM (VALUES
  (1,  'Alpaca Legends',       'The legendary alpaca breeders',             1),
  (2,  'Spit Masters',         'For serious Spit Royale competitors',       5),
  (3,  'Casual Gamers',        'Just here to have fun',                    10),
  (4,  'Night Owls',           'Late night gaming crew',                   15),
  (5,  'Speed Demons',         'Fast-paced Spit Royale enthusiasts',       20),
  (6,  'Farm Union',           'Alpaca farm optimization group',           25),
  (7,  'Achievement Hunters',  'Complete every achievement together',      30),
  (8,  'European Alliance',    'European time zone players',               35),
  (9,  'Rookie Club',          'New players helping each other',           40),
  (10, 'Elite Squad',          'Top-ranked players only',                  45),
  (11, 'Meme Team',            'Fun and memes',                            50),
  (12, 'Code Monkeys',         'Developers who play games',               55),
  (13, 'AlpacaParty OGs',      'Original members of the platform',        60),
  (14, 'The Strategists',      'Deep Spit Royale strategy discussions',    65),
  (15, 'Weekend Warriors',     'Active on weekends',                       70),
  (16, 'Coin Collectors',      'Maximizing coin earnings',                75),
  (17, 'Level Grinders',       'XP farming strategies',                    80),
  (18, 'Social Butterflies',   'Making friends across the platform',       85),
  (19, 'Tournament Org',       'Organizing community tournaments',         90),
  (20, 'Beta Testers',         'Testing new features before release',      95)
) AS v(i, org_name, org_desc, owner)
ON CONFLICT (name) DO NOTHING;

-- ── Organization Members (5-20 per org) ──────────────────────────────────

-- Owner as member
INSERT INTO organization_members (org_id, user_id, role, joined_at)
SELECT o.id, o.owner_id, 'owner', o.created_at
FROM organizations o
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Additional members
INSERT INTO organization_members (org_id, user_id, role, joined_at)
SELECT
  o.id,
  ((o.id * 11 + m * 3) % 200) + 1,
  CASE WHEN m <= 2 THEN 'admin' ELSE 'member' END,
  o.created_at + (interval '1 hour' * m)
FROM organizations o
CROSS JOIN generate_series(1, 20) AS m
WHERE ((o.id * 11 + m * 3) % 200) + 1 <> o.owner_id
  AND m <= 5 + (o.id % 16)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 10. GAMES (400 games with varied outcomes)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO games (player1_id, player2_id, winner_id, player1_score, player2_score, status, game_type, game_data, started_at, finished_at, created_at)
SELECT
  p1, p2,
  CASE
    WHEN i % 10 = 0 THEN NULL                    -- 10% draws (no winner)
    WHEN i % 3 = 0 THEN p2                       -- 30% player2 wins
    ELSE p1                                        -- 60% player1 wins
  END,
  CASE WHEN i % 10 = 0 THEN 5 WHEN i % 3 = 0 THEN 2 + (i % 4) ELSE 5 + (i % 6) END,
  CASE WHEN i % 10 = 0 THEN 5 WHEN i % 3 = 0 THEN 5 + (i % 6) ELSE 2 + (i % 4) END,
  CASE
    WHEN i > 380 THEN 'playing'                   -- last 20 games still in progress
    WHEN i > 370 THEN 'waiting'                    -- 10 games waiting
    ELSE 'finished'
  END,
  CASE WHEN i % 5 = 0 THEN 'survival' ELSE 'spit_royale' END,
  '{}'::jsonb,
  ts - interval '5 minutes',
  CASE WHEN i <= 370 THEN ts ELSE NULL END,
  ts - interval '10 minutes'
FROM (
  SELECT
    i,
    ((i - 1) % 200) + 1 AS p1,
    (((i - 1) * 7 + 50) % 200) + 1 AS p2,
    NOW() - (interval '30 minutes' * (400 - i)) AS ts
  FROM generate_series(1, 400) AS i
) g
WHERE p1 <> p2;

-- ══════════════════════════════════════════════════════════════════════════
-- 11. GAME STATS (for top 100 active players)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO game_stats (user_id, game_type, wins, losses, draws, elo, updated_at)
SELECT
  i,
  'spit_royale',
  (i * 3 + 5) % 50,                               -- wins 5-49
  (i * 2 + 3) % 30,                                -- losses 3-29
  i % 5,                                            -- draws 0-4
  1000 + ((i * 3 + 5) % 50 - (i * 2 + 3) % 30) * 16,  -- ELO based on win/loss diff
  NOW() - (interval '1 hour' * (100 - i))
FROM generate_series(1, 100) AS i
ON CONFLICT (user_id, game_type) DO NOTHING;

-- Survival mode stats for some players
INSERT INTO game_stats (user_id, game_type, wins, losses, draws, elo, updated_at)
SELECT
  i,
  'survival',
  (i * 2 + 1) % 20,
  (i + 2) % 15,
  i % 3,
  1000 + ((i * 2 + 1) % 20 - (i + 2) % 15) * 16,
  NOW() - (interval '2 hours' * (50 - i))
FROM generate_series(1, 50) AS i
ON CONFLICT (user_id, game_type) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 12. USER ACHIEVEMENTS (varied unlocks)
-- ══════════════════════════════════════════════════════════════════════════

-- first_login for first 180 users
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT i, (SELECT id FROM achievements WHERE key = 'first_login'), NOW() - (interval '1 day' * (200 - i))
FROM generate_series(1, 180) AS i
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- first_win for top 80 players
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT i, (SELECT id FROM achievements WHERE key = 'first_win'), NOW() - (interval '1 day' * (100 - i))
FROM generate_series(1, 80) AS i
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- win_streak_5 for top 20 players
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT i, (SELECT id FROM achievements WHERE key = 'win_streak_5'), NOW() - (interval '1 day' * (25 - i))
FROM generate_series(1, 20) AS i
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- social_butter for users with many friends
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT i, (SELECT id FROM achievements WHERE key = 'social_butter'), NOW() - (interval '1 day' * (50 - i))
FROM generate_series(1, 40) AS i
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- org_founder for org owners
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT DISTINCT o.owner_id, (SELECT id FROM achievements WHERE key = 'org_founder'), o.created_at
FROM organizations o
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- level_10 for users who reached level 10
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT id, (SELECT id FROM achievements WHERE key = 'level_10'), NOW() - interval '3 days'
FROM users WHERE level >= 10
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- first_post for users who have posts
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT DISTINCT author_id, (SELECT id FROM achievements WHERE key = 'first_post'), MIN(created_at)
FROM posts
GROUP BY author_id
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 13. DAILY CHALLENGES (7 days of challenges)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO daily_challenges (title, description, xp_reward, active_date)
VALUES
  ('Win 3 Spit Royale games', 'Win 3 games of Spit Royale today',        50, CURRENT_DATE),
  ('Send 5 messages',         'Chat with your friends! Send 5 DMs',      20, CURRENT_DATE),
  ('Like 3 posts',            'Show some love! Like 3 posts on the feed', 15, CURRENT_DATE),
  ('Play 5 games',            'Play any 5 games today',                   30, CURRENT_DATE - 1),
  ('Make a new friend',       'Send or accept a friend request',          25, CURRENT_DATE - 1),
  ('Create a post',           'Share something on the feed',              20, CURRENT_DATE - 1),
  ('Win a game without losing a point', 'Flawless victory!',            100, CURRENT_DATE - 2),
  ('Visit 3 user profiles',   'Check out other players'' profiles',       10, CURRENT_DATE - 2),
  ('Join a chat room',        'Participate in a group conversation',      15, CURRENT_DATE - 2),
  ('Reach 1100 ELO',          'Climb the competitive ladder!',            75, CURRENT_DATE - 3),
  ('Play 10 games',           'Marathon gaming session!',                  50, CURRENT_DATE - 3),
  ('Send a message in a group', 'Chat in any group room',                 15, CURRENT_DATE - 4),
  ('Earn 100 coins',          'Accumulate 100 coins today',               40, CURRENT_DATE - 5),
  ('Win 5 games in a row',    'Get on a winning streak!',                 80, CURRENT_DATE - 6);

-- ── User Daily Challenge Progress ────────────────────────────────────────

INSERT INTO user_daily_challenges (user_id, challenge_id, completed, completed_at)
SELECT
  ((i * 3 + c.id) % 200) + 1,
  c.id,
  CASE WHEN i % 3 <> 0 THEN TRUE ELSE FALSE END,
  CASE WHEN i % 3 <> 0 THEN NOW() - (interval '1 hour' * i) ELSE NULL END
FROM daily_challenges c
CROSS JOIN generate_series(1, 15) AS i
ON CONFLICT (user_id, challenge_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 14. NOTIFICATIONS (varied types across users)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO notifications (user_id, type, title, message, is_read, reference_type, reference_id, created_at)
SELECT
  (i % 200) + 1,
  CASE (i % 7)
    WHEN 0 THEN 'friend_request'
    WHEN 1 THEN 'friend_accepted'
    WHEN 2 THEN 'post_like'
    WHEN 3 THEN 'achievement'
    WHEN 4 THEN 'game_invite'
    WHEN 5 THEN 'org_invite'
    ELSE 'message'
  END,
  CASE (i % 7)
    WHEN 0 THEN 'New Friend Request'
    WHEN 1 THEN 'Friend Request Accepted'
    WHEN 2 THEN 'Post Liked'
    WHEN 3 THEN 'Achievement Unlocked!'
    WHEN 4 THEN 'Game Invitation'
    WHEN 5 THEN 'Organization Invite'
    ELSE 'New Message'
  END,
  CASE (i % 7)
    WHEN 0 THEN 'user_' || ((i * 3) % 200 + 1) || ' wants to be your friend'
    WHEN 1 THEN 'user_' || ((i * 5) % 200 + 1) || ' accepted your friend request'
    WHEN 2 THEN 'user_' || ((i * 7) % 200 + 1) || ' liked your post'
    WHEN 3 THEN 'You unlocked a new achievement!'
    WHEN 4 THEN 'user_' || ((i * 11) % 200 + 1) || ' invited you to play Spit Royale'
    WHEN 5 THEN 'You have been invited to join an organization'
    ELSE 'You have a new message from user_' || ((i * 13) % 200 + 1)
  END,
  CASE WHEN i % 4 = 0 THEN FALSE ELSE TRUE END,      -- ~25% unread
  CASE (i % 7)
    WHEN 0 THEN 'friend_request'
    WHEN 1 THEN 'friend_request'
    WHEN 2 THEN 'post'
    WHEN 3 THEN 'achievement'
    WHEN 4 THEN 'game'
    WHEN 5 THEN 'organization'
    ELSE 'message'
  END,
  i,
  NOW() - (interval '10 minutes' * (800 - i))
FROM generate_series(1, 800) AS i;

-- ══════════════════════════════════════════════════════════════════════════
-- 15. ALPACA FARMS (for 100 users)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO alpaca_farms (user_id, farm_data, updated_at)
SELECT
  i,
  jsonb_build_object(
    'alpacas', jsonb_build_array(
      jsonb_build_object('name', 'Fluffy', 'color', 'white', 'level', 1 + i % 5),
      jsonb_build_object('name', 'Spark', 'color', 'brown', 'level', 1 + (i + 1) % 5)
    ),
    'resources', jsonb_build_object('gold', 100 + i * 10, 'food', 50 + i * 5),
    'level', 1 + i % 8
  ),
  NOW() - (interval '1 hour' * (100 - i))
FROM generate_series(1, 100) AS i
ON CONFLICT (user_id) DO NOTHING;

END $$;

COMMIT;

-- ── Summary ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Users:              %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'Friend Requests:    %', (SELECT COUNT(*) FROM friend_requests);
  RAISE NOTICE 'Friends:            %', (SELECT COUNT(*) FROM friends);
  RAISE NOTICE 'Blocked Users:      %', (SELECT COUNT(*) FROM blocked_users);
  RAISE NOTICE 'DM Messages:        %', (SELECT COUNT(*) FROM messages);
  RAISE NOTICE 'Chat Rooms:         %', (SELECT COUNT(*) FROM chat_rooms);
  RAISE NOTICE 'Chat Room Members:  %', (SELECT COUNT(*) FROM chat_room_members);
  RAISE NOTICE 'Chat Room Messages: %', (SELECT COUNT(*) FROM chat_room_messages);
  RAISE NOTICE 'Posts:              %', (SELECT COUNT(*) FROM posts);
  RAISE NOTICE 'Post Likes:         %', (SELECT COUNT(*) FROM post_likes);
  RAISE NOTICE 'Organizations:      %', (SELECT COUNT(*) FROM organizations);
  RAISE NOTICE 'Org Members:        %', (SELECT COUNT(*) FROM organization_members);
  RAISE NOTICE 'Games:              %', (SELECT COUNT(*) FROM games);
  RAISE NOTICE 'Game Stats:         %', (SELECT COUNT(*) FROM game_stats);
  RAISE NOTICE 'Achievements (u):   %', (SELECT COUNT(*) FROM user_achievements);
  RAISE NOTICE 'Daily Challenges:   %', (SELECT COUNT(*) FROM daily_challenges);
  RAISE NOTICE 'Notifications:      %', (SELECT COUNT(*) FROM notifications);
  RAISE NOTICE 'Alpaca Farms:       %', (SELECT COUNT(*) FROM alpaca_farms);
  RAISE NOTICE '=========================';
END $$;
