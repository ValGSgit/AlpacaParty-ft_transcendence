/**
 * Auth Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import express from 'express';
import passport from 'passport';
import { register, login, logout, refresh, me, oauthCallback } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);

// ── OAuth ─────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  oauthCallback,
);

router.get('/github',
  passport.authenticate('github', { scope: ['user:email'], session: false }),
);
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', session: false }),
  oauthCallback,
);

export default router;
