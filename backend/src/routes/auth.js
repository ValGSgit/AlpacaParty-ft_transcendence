/**
 * Auth Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import express from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  logout,
  refresh,
  me,
  oauthCallback,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import {
  authLoginValidation,
  authRegisterValidation,
} from "#validators/authValidator.js";

const router = express.Router();

// Strict limiter for credential endpoints — 50 attempts per 15 min per IP.
// The global /api limiter (1000/15 min) is too loose to prevent brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: () => process.env.NODE_ENV === "test",
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, minLength: 3, maxLength: 32, example: alpaca42 }
 *               email: { type: string, format: email, example: alpaca@example.com }
 *               password: { type: string, minLength: 8, description: "Must contain uppercase, lowercase, and a digit", example: Secret123 }
 *     responses:
 *       201:
 *         description: Registered — returns tokens and user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Validation error }
 *       409: { description: Username or email already taken }
 */
router.post("/register", authLimiter, authRegisterValidation(), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with username (or email) and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: "Username OR email address", example: alpaca42 }
 *               password: { type: string, example: Secret123 }
 *     responses:
 *       200:
 *         description: Login successful — returns tokens and user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Invalid credentials }
 */
router.post("/login", authLimiter, authLoginValidation(), login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (invalidates refresh token)
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", authenticate, logout);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401: { description: Invalid or expired refresh token }
 */
router.post("/refresh", refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
router.get("/me", authenticate, me);

// ── OAuth ─────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  oauthCallback,
);

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login",
    session: false,
  }),
  oauthCallback,
);

export default router;
