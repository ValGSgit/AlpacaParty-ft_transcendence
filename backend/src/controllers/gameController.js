/**
 * Game Controller — REST endpoints for game history, stats, leaderboard, farm
 * Real-time game flow is handled by socketService.js
 * @owner ValGSgit
 */
import Game from '../models/Game.js';
import Achievement from '../models/Achievement.js';

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

/** GET /api/game/leaderboard?gameType=spit_royale&limit=20 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { gameType = 'spit_royale', limit = 20, offset = 0 } = req.query;
    const leaderboard = await Game.getLeaderboard(gameType, { limit: Number(limit), offset: Number(offset) });
    res.json({ leaderboard });
  } catch (err) { next(err); }
};

/** GET /api/game/farm */
export const getFarm = async (req, res, next) => {
  try {
    const farm = await Game.getFarm(req.user.id);
    res.json({ farm });
  } catch (err) { next(err); }
};

/** PUT /api/game/farm */
export const saveFarm = async (req, res, next) => {
  try {
    const farmData = req.body.farmData ?? req.body.farm;
    const farm = await Game.updateFarm(req.user.id, farmData);
    res.json({ farm });
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
