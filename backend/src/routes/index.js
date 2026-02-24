/**
 * API Route Index
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/9
 *
 * Mount sub-routers here as they are implemented.
 */
import express from 'express';
import { createRequire } from 'module';
import authRoutes from './auth.js';
import userRoutes from './users.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const router = express.Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Cleanscendence backend is running',
    timestamp: new Date().toISOString(),
    version,
  });
});

// Mounted route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// TODO: Mount remaining route modules as issues are completed
// import friendRoutes from './friends.js';     // Issue #9
// import chatRoutes from './chat.js';          // Issue #9
// import gameRoutes from './game.js';          // Issue #9
// import notificationRoutes from './notifications.js';
// router.use('/friends', friendRoutes);
// router.use('/chat', chatRoutes);
// router.use('/game', gameRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
