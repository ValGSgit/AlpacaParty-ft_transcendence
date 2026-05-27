/**
 * Game Controller — REST endpoints for game history, stats, leaderboard, farm
 * Real-time game flow is handled by socketService.js
 * @owner ValGSgit
 */
import Game from '../models/Game.js';
import Achievement from '../models/Achievement.js';
import GamificationService from '../services/GamificationService.js';

/** GET /api/game/stats?gameType=spit_royale */
export const getStats = async (req, res, next) => {
  try {
    const gameType = req.query.gameType || 'spit_royale';
    const stats = await Game.getStats(req.user.id, gameType);
    res.json({ stats });
  } catch (err) { next(err); }
};

/** GET /api/game/history?gameType=spit_royale&limit=20&offset=0 */
export const getHistory = async (req, res, next) => {
  try {
    const { gameType, limit = 20, offset = 0 } = req.query;
    const matches = await Game.getMatchHistory(req.user.id, {
      limit: Number(limit), offset: Number(offset), gameType,
    });
    res.json({ history: matches });
  } catch (err) { next(err); }
};

/** GET /api/game/leaderboard?board=kills|obstacles|coins&limit=20&offset=0
 *
 *  Single endpoint with a `board` selector — the frontend renders three
 *  tables side-by-side, so three round-trips beats three bespoke endpoints.
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const board = String(req.query.board || 'kills');
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    let leaderboard;
    if (board === 'kills') {
      leaderboard = await Game.getKillsLeaderboard({ limit, offset });
    } else if (board === 'obstacles') {
      leaderboard = await Game.getObstaclesLeaderboard({ limit, offset });
    } else if (board === 'coins') {
      leaderboard = await Game.getCoinsLeaderboard({ limit, offset });
    } else {
      return res.status(400).json({
        error: { message: "board must be one of: kills, obstacles, coins" },
      });
    }
    res.json({ board, leaderboard });
  } catch (err) { next(err); }
};

/** GET /api/game/leaderboard/coins — kept for backward compatibility */
export const getCoinsLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const leaderboard = await Game.getCoinsLeaderboard({ limit, offset });
    res.json({ board: 'coins', leaderboard });
  } catch (err) { next(err); }
};

/**
 * POST /api/game/result — Save offline/AI game result.
 *
 * The body is client-supplied, so we intentionally do NOT trust a 'win'
 * here — that would let any authenticated user farm achievements + coins
 * by spamming POSTs without ever playing. Online matches persist server-side
 * via the socket flow (see MatchManager). Only "loss"/"draw" are accepted
 * from this endpoint (you can't cheat XP downward).
 */
export const saveGameResult = async (req, res, next) => {
  try {
    const { gameType, result } = req.body;
    if (!gameType || !result) {
      return res.status(400).json({ error: { message: 'gameType and result required' } });
    }
    if (!['loss', 'draw'].includes(result)) {
      return res.status(400).json({
        error: { message: "Only 'loss' or 'draw' may be reported here; wins are persisted server-side." },
      });
    }

    // Offline games may also report counters (kills cleared per wave,
    // obstacles jumped per run). We cap them server-side so a client
    // can't farm the leaderboard with arbitrary numbers.
    const killsThisRun = Math.max(0, Math.min(200, Number(req.body.kills) || 0));
    const obstaclesThisRun = Math.max(0, Math.min(500, Number(req.body.obstacles) || 0));

    await Game.updateStats(req.user.id, gameType, result);
    if (gameType === 'spit_royale' && killsThisRun > 0) {
      await Game.incrementCounter(req.user.id, gameType, 'kills', killsThisRun);
    }
    if (gameType === 'alpaca_road' && obstaclesThisRun > 0) {
      await Game.incrementCounter(req.user.id, gameType, 'obstacles', obstaclesThisRun);
    }

    const stats = await Game.getStats(req.user.id, gameType);
    res.json({ stats });

    if (result === 'loss') {
      GamificationService.onLoss(req.user.id).catch(() => {});
    }
  } catch (err) { next(err); }
};

/** GET /api/game/farm?userId=X — own farm or another user's farm */
export const getFarm = async (req, res, next) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
    const farm = await Game.getFarm(userId);
    res.json({ farm });
  } catch (err) { next(err); }
};

/**
 * PUT /api/game/farm — accepts { farmData }, { farm }, or flat
 * { items, alpacas, coins, upgrades, herdsize }.
 *
 * The client routinely sends large payloads on autosave; we cap the
 * arrays here so a single bad client (or a stretched WAF body limit)
 * can't blow up the JSONB column.
 */
const FARM_FLAT_KEYS = ['items', 'alpacas', 'coins', 'upgrades', 'herdsize'];
const MAX_ITEMS = 500;
const MAX_ALPACAS = 100;

export const saveFarm = async (req, res, next) => {
  try {
    const isFlat = FARM_FLAT_KEYS.some((k) => k in req.body);
    const raw = req.body.farmData ?? req.body.farm ?? (isFlat ? req.body : null);
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: { message: 'farmData is required' } });
    }

    // Clamp arrays + numerics. Anything outside the schema is dropped.
    const clean = {};
    if (Array.isArray(raw.items))   clean.items   = raw.items.slice(0, MAX_ITEMS);
    if (Array.isArray(raw.alpacas)) clean.alpacas = raw.alpacas.slice(0, MAX_ALPACAS);
    if (typeof raw.coins === 'number'    && Number.isFinite(raw.coins))    clean.coins    = Math.max(0, Math.floor(raw.coins));
    if (typeof raw.upgrades === 'number' && Number.isFinite(raw.upgrades)) clean.upgrades = Math.max(0, Math.floor(raw.upgrades));
    if (typeof raw.herdsize === 'number' && Number.isFinite(raw.herdsize)) clean.herdsize = Math.max(0, Math.floor(raw.herdsize));

    const farm = await Game.updateFarm(req.user.id, clean);
    res.json({ farm });
    GamificationService.onFarmSave(req.user.id, clean).catch(() => {});
  } catch (err) { next(err); }
};

/** GET /api/game/achievements */
export const getAchievements = async (req, res, next) => {
  try {
    const [all, unlocked] = await Promise.all([
      Achievement.getAll(),
      Achievement.getUserAchievements(req.user.id),
    ]);
    const unlockedKeys = new Set(unlocked.map((a) => a.key));
    const achievements = all.map((a) => ({ ...a, unlocked: unlockedKeys.has(a.key) }));
    res.json({ achievements });
  } catch (err) { next(err); }
};

/** GET /api/game/challenges */
export const getChallenges = async (req, res, next) => {
  try {
    const challenges = await Achievement.getUserChallengeProgress(req.user.id);
    res.json({ challenges });
  } catch (err) { next(err); }
};
