/**
 * Auth Controller — handles registration, login, logout, token refresh, OAuth
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/8
 */
import User, { shapeUserForClient } from "../models/User.js";
import Achievement from "../models/Achievement.js";
import AuthService from "../services/authService.js";
import { oauthTokensForUser } from "../services/oauthService.js";
import config from "../config/index.js";
import { customValidationResult } from "#validators/validatorUtils.js";
import prisma from "#lib/prisma.js";
import CustomError from "#utils/CustomError.js";

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    customValidationResult(req).throw();

    const { username, email, password } = req.body;

    // Unique username and email ?
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: username }, { email: email }] },
    });
    if (existing) {
      if (existing.username == username) {
        throw new CustomError("User already taken", 400);
      } else {
        throw new CustomError("Email already exists", 400);
      }
    }

    // Create user
    const passwordHash = await AuthService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username,
        email: email,
        userAuth: {
          create: {
            passwordHash: passwordHash,
          },
        },
      },
    });

    await Achievement.unlock(user.id, "first_login");
    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    customValidationResult(req).throw();

    const { username, password } = req.body;

    // Allow login with username or email
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: username }, { email: username }] },
      include: { userAuth: true },
    });
    if (!user) throw new CustomError("Invalid credentials", 401);

    // console.log(`${user}`);
    console.log(JSON.stringify(user, null, 2));

    const valid = await AuthService.comparePassword(
      password,
      user.userAuth.passwordHash,
    );
    if (!valid) throw new CustomError("Invalid credentials", 401);

    await User.setOnline(user.id);

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Strip sensitive fields before returning
    const { passwordHash, ...safeUser } = user;

    res.json({
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.setOffline(req.user.id);
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new CustomError("refresh token is required", 400);

    const decoded = AuthService.verifyToken(refreshToken);
    if (!decoded || decoded.type !== "refresh")
      throw new CustomError("Invalid refresh token", 401);

    const user = await prisma.user.findFirst({ where: { id: decoded.id } });
    if (!user) throw new CustomError("User not found", 401);

    const accessToken = AuthService.generateAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
export const me = async (req, res) =>
  res.json({ user: shapeUserForClient(req.user) });

/** OAuth callback (Google / GitHub) */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  res.redirect(
    `${config.frontendUrl}/oauth-callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`,
  );
};
