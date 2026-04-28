/**
 * API Route Index
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/9
 */
import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import friendRoutes from './friends.js';
import chatRoutes from './chat.js';
import gameRoutes from './game.js';
import postRoutes from './posts.js';
import notificationRoutes from './notifications.js';
import uploadRoutes from './uploads.js';
import publicRoutes from './public.js';

const router = express.Router();

// ── Health check ────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'AlpacaParty backend is running',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// ── Route modules ────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/chat', chatRoutes);
router.use('/game', gameRoutes);
router.use('/posts', postRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/public', publicRoutes);

export default router;
