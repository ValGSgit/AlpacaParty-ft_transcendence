/**
 * API Route Index
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/9
 *
 * Mount sub-routers here as they are implemented.
 */
import express from 'express';

const router = express.Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Cleanscendence backend is running',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
  });
});

// TODO: Mount route modules as issues are completed
// import authRoutes from './auth.js';          // Issue #8
// import userRoutes from './users.js';         // Issue #9
// import friendRoutes from './friends.js';     // Issue #9
// import chatRoutes from './chat.js';          // Issue #9
// import gameRoutes from './game.js';          // Issue #9
// import notificationRoutes from './notifications.js';

// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/friends', friendRoutes);
// router.use('/chat', chatRoutes);
// router.use('/game', gameRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
