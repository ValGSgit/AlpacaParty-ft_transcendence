/**
 * Auth Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import express from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refresh, me, oauthCallback } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Strict limiter for credential endpoints — 50 attempts per 15 min per IP.
// The global /api limiter (1000/15 min) is too loose to prevent brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
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
