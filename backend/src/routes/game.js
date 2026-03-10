/**
 * Game Routes — /api/game
 */
import express from 'express';
import {
  getStats, getHistory, getLeaderboard,
  getFarm, saveFarm, getAchievements, getChallenges,
} from '../controllers/gameController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/stats', getStats);
router.get('/history', getHistory);
router.get('/leaderboard', getLeaderboard);
router.get('/farm', getFarm);
router.put('/farm', saveFarm);
router.get('/achievements', getAchievements);
router.get('/challenges', getChallenges);

export default router;
