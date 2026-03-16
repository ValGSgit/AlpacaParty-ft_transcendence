/**
 * Game Model — games table + game_stats + alpaca_farms
 * @owner ValGSgit
 */
import { query, getClient } from '../config/database.js';

const Game = {
  // ── Match CRUD ──────────────────────────────────────────────

  async create({ player1Id, gameType = 'X' }) {
    const { rows } = await query(
      `INSERT INTO games (player1_id, game_type) VALUES ($1, $2) RETURNING *`,
      [player1Id, gameType],
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM games WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async joinGame(gameId, player2Id) {
    const { rows } = await query(
      `UPDATE games SET player2_id = $1, status = 'playing', started_at = NOW()
       WHERE id = $2 AND status = 'waiting' AND player1_id != $1 RETURNING *`,
      [player2Id, gameId],
    );
    return rows[0] || null;
  },

  async updateScore(gameId, { player1Score, player2Score }) {
    const { rows } = await query(
      `UPDATE games SET player1_score = $1, player2_score = $2 WHERE id = $3 RETURNING *`,
      [player1Score, player2Score, gameId],
    );
    return rows[0];
  },

  async finishGame(gameId, { winnerId, player1Score, player2Score }) {
    const { rows } = await query(
      `UPDATE games SET status = 'finished', winner_id = $1,
              player1_score = $2, player2_score = $3, finished_at = NOW()
       WHERE id = $4 RETURNING *`,
      [winnerId, player1Score, player2Score, gameId],
    );
    return rows[0];
  },

  async cancelGame(gameId) {
    const { rows } = await query(
      `UPDATE games SET status = 'cancelled', finished_at = NOW() WHERE id = $1 RETURNING *`,
      [gameId],
    );
    return rows[0];
  },

  async findWaiting(gameType = 'pong', excludePlayerId = null) {
    let q = `SELECT * FROM games WHERE status = 'waiting' AND game_type = $1`;
    const params = [gameType];
    if (excludePlayerId) {
      q += ` AND player1_id != $2`;
      params.push(excludePlayerId);
    }
    q += ` ORDER BY created_at ASC LIMIT 1`;
    const { rows } = await query(q, params);
    return rows[0] || null;
  },

  // ── Match History ──────────────────────────────────────────

  async getMatchHistory(userId, { limit = 20, offset = 0, gameType } = {}) {
    let q = `SELECT g.*,
                u1.username AS player1_username, u1.avatar AS player1_avatar,
                u2.username AS player2_username, u2.avatar AS player2_avatar
             FROM games g
             JOIN users u1 ON u1.id = g.player1_id
             LEFT JOIN users u2 ON u2.id = g.player2_id
             WHERE (g.player1_id = $1 OR g.player2_id = $1) AND g.status = 'finished'`;
    const params = [userId];
    if (gameType) {
      params.push(gameType);
      q += ` AND g.game_type = $${params.length}`;
    }
    params.push(limit, offset);
    q += ` ORDER BY g.finished_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await query(q, params);
    return rows;
  },

  // ── Stats ──────────────────────────────────────────────────

  async getStats(userId, gameType = 'pong') {
    const { rows } = await query(
      `SELECT * FROM game_stats WHERE user_id = $1 AND game_type = $2`,
      [userId, gameType],
    );
    return rows[0] || { user_id: userId, game_type: gameType, wins: 0, losses: 0, draws: 0, elo: 1000 };
  },

  async updateStats(userId, gameType, result) {
    // result: 'win' | 'loss' | 'draw'
    const col = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws';
    const { rows } = await query(
      `INSERT INTO game_stats (user_id, game_type, ${col})
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, game_type)
       DO UPDATE SET ${col} = game_stats.${col} + 1, updated_at = NOW()
       RETURNING *`,
      [userId, gameType],
    );
    return rows[0];
  },

  async updateElo(userId, gameType, newElo) {
    await query(
      `UPDATE game_stats SET elo = $1, updated_at = NOW() WHERE user_id = $2 AND game_type = $3`,
      [newElo, userId, gameType],
    );
  },

  // ── Leaderboard ────────────────────────────────────────────

  async getLeaderboard(gameType = 'pong', { limit = 20, offset = 0, publicOnly = false } = {}) {
    const publicFilter = publicOnly ? 'AND u.is_public = TRUE' : '';
    const { rows } = await query(
      `SELECT gs.*, u.username, u.avatar, u.level
       FROM game_stats gs JOIN users u ON u.id = gs.user_id
       WHERE gs.game_type = $1 ${publicFilter}
       ORDER BY gs.elo DESC LIMIT $2 OFFSET $3`,
      [gameType, limit, offset],
    );
    return rows;
  },

  // ── Alpaca Farm ────────────────────────────────────────────

  async getFarm(userId) {
    let { rows } = await query(`SELECT * FROM alpaca_farms WHERE user_id = $1`, [userId]);
    if (!rows[0]) {
      ({ rows } = await query(
        `INSERT INTO alpaca_farms (user_id) VALUES ($1) RETURNING *`,
        [userId],
      ));
    }
    return rows[0];
  },

  async updateFarm(userId, farmData) {
    const { rows } = await query(
      `UPDATE alpaca_farms SET farm_data = $1, updated_at = NOW()
       WHERE user_id = $2 RETURNING *`,
      [JSON.stringify(farmData), userId],
    );
    return rows[0];
  },

  // ── Admin Stats ────────────────────────────────────────────

  async countActive() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS total FROM games WHERE status = 'playing'`,
    );
    return rows[0].total;
  },
};

export default Game;
