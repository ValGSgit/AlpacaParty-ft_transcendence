-- ==========================================================================
-- PostgreSQL Initialisation Script
-- @owner   DavidPoetsch, ValGSgit
-- @issue   https://github.com/ValGSgit/Cleanscendence/issues/10
--
-- This file is mounted into the postgres container via docker-entrypoint-initdb.d
-- and runs automatically on first start (when the data volume is empty).
-- ==========================================================================

-- ── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(32)  UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                  -- NULL for OAuth-only accounts
    avatar        VARCHAR(512) DEFAULT '/avatars/default.png',
    bio           TEXT         DEFAULT '',
    alpacas       JSONB        DEFAULT '[]'::jsonb,
    items         JSONB        DEFAULT '[]'::jsonb,
    coins         INT          DEFAULT 10,
    upgrades      INT          DEFAULT 0,
    status        VARCHAR(255) DEFAULT 'Hey there! I am using Cleanscendence',
    is_public     BOOLEAN      DEFAULT TRUE,
    is_online     BOOLEAN      DEFAULT FALSE,
    is_admin      BOOLEAN      DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret  VARCHAR(255),
    oauth_provider VARCHAR(20),                  -- 'google', 'github', NULL
    oauth_id       VARCHAR(255),                 -- provider user id
    xp             INT          DEFAULT 0,
    level          INT          DEFAULT 1,
    last_seen     TIMESTAMPTZ  DEFAULT NOW(),
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)
    WHERE oauth_provider IS NOT NULL;

-- ── Friend Requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_requests (
    id          SERIAL PRIMARY KEY,
    sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(10) DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sender_id, receiver_id)
);

-- ── Friends ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
    id        SERIAL PRIMARY KEY,
    user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, friend_id)
);

-- ── Blocked Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
    id             SERIAL PRIMARY KEY,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, blocked_user_id)
);

-- ── Chat Messages (DM) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    is_read     BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat Rooms (group chats) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    owner_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_private  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    id          SERIAL PRIMARY KEY,
    room_id     INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(10) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_room_messages (
    id          SERIAL PRIMARY KEY,
    room_id     INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Games ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
    id            SERIAL PRIMARY KEY,
    player1_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id    INT REFERENCES users(id) ON DELETE SET NULL,
    winner_id     INT REFERENCES users(id) ON DELETE SET NULL,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
    game_type     VARCHAR(30) DEFAULT 'pong',
    game_data     JSONB       DEFAULT '{}',      -- arbitrary per-game state snapshot
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Game Statistics (per-user, per-game-type) ────────────────────────────
CREATE TABLE IF NOT EXISTS game_stats (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type   VARCHAR(30) NOT NULL DEFAULT 'pong',
    wins        INT DEFAULT 0,
    losses      INT DEFAULT 0,
    draws       INT DEFAULT 0,
    elo         INT DEFAULT 1000,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, game_type)
);

-- ── Achievements / Badges ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(60) UNIQUE NOT NULL,      -- e.g. 'first_win'
    name        VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    icon        VARCHAR(512) DEFAULT '',
    xp_reward   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id             SERIAL PRIMARY KEY,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

-- ── Daily Challenges ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_challenges (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    xp_reward   INT DEFAULT 0,
    active_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id  INT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    completed     BOOLEAN DEFAULT FALSE,
    completed_at  TIMESTAMPTZ,
    UNIQUE (user_id, challenge_id)
);

-- ── Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL,
    title       VARCHAR(255) NOT NULL DEFAULT '',
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      DEFAULT FALSE,
    reference_type VARCHAR(50),                  -- 'friend_request', 'game', 'org', etc.
    reference_id INT,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Posts / Feed ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    author_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    image_url   VARCHAR(512),
    is_public   BOOLEAN DEFAULT TRUE,
    likes_count INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
    id        SERIAL PRIMARY KEY,
    post_id   INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

-- ── Organizations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    avatar      VARCHAR(512) DEFAULT '/avatars/default-org.png',
    owner_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
    id        SERIAL PRIMARY KEY,
    org_id    INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role      VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

-- ── Files / Uploads ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id            SERIAL PRIMARY KEY,
    uploader_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(512) NOT NULL,
    stored_name   VARCHAR(512) NOT NULL,
    mime_type     VARCHAR(100) NOT NULL,
    size_bytes    BIGINT NOT NULL,
    url           VARCHAR(1024) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alpaca Farm (offline game state) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS alpaca_farms (
    id          SERIAL PRIMARY KEY,
    user_id     INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_data   JSONB DEFAULT '{"alpacas":[],"resources":{"gold":100,"food":50},"level":1}',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Password Reset Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── GDPR Data Requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_requests (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('export', 'delete')),
    status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    file_url    VARCHAR(1024),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ── Seed achievements ────────────────────────────────────────────────────
INSERT INTO achievements (key, name, description, xp_reward) VALUES
    ('first_login',   'Welcome!',           'Log in for the first time',          10),
    ('first_win',     'Victor',             'Win your first game',                25),
    ('win_streak_5',  'On Fire',            'Win 5 games in a row',              50),
    ('social_butter', 'Social Butterfly',   'Add 10 friends',                    30),
    ('org_founder',   'Founder',            'Create an organization',            20),
    ('level_10',      'Veteran',            'Reach level 10',                   100),
    ('first_post',    'Storyteller',        'Create your first post',            15)
ON CONFLICT (key) DO NOTHING;

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_games_player1     ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2     ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_posts_author       ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_public        ON posts(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_members_user    ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_user     ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_msgs_room ON chat_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_files_uploader      ON files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_user  ON data_requests(user_id);
