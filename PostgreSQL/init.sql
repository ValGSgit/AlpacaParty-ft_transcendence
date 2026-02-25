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
    password_hash VARCHAR(255) NOT NULL,
    avatar        VARCHAR(512) DEFAULT '/avatars/default.png',
    bio           TEXT         DEFAULT '',
    alpacas       JSONB        DEFAULT '[]'::jsonb,
    items         JSONB        DEFAULT '[]'::jsonb,
    coins         INT          DEFAULT 10,
    upgrades      INT          DEFAULT 0,
    status        VARCHAR(255) DEFAULT 'Hey there! I am using Cleanscendence',
    is_online     BOOLEAN      DEFAULT FALSE,
    is_admin      BOOLEAN      DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret  VARCHAR(255),
    last_seen     TIMESTAMPTZ  DEFAULT NOW(),
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

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

-- ── Chat Messages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    is_read     BOOLEAN     DEFAULT FALSE,
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
    game_type     VARCHAR(20) DEFAULT 'pong',
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL,
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      DEFAULT FALSE,
    reference_id INT,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Password Reset Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_games_player1     ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2     ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
