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
import CustomError from "#utils/CustomError.js";

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    customValidationResult(req).throw();

    const { username, email, password } = req.body;

    // Unique username and email ?
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new CustomError("User already taken", 409);
    }
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new CustomError("Email already exists", 409);
    }

    // Create user (User.create also creates userAuth, userStats, userSettings)
    const passwordHash = await AuthService.hashPassword(password);
    const user = await User.create({ username, email, passwordHash });

    try {
      await Achievement.unlock(user.id, "first_login");
    } catch {
      // Avoid failing registration if achievement bookkeeping is unavailable.
    }
    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
    res.cookie("refresh_token", refreshToken, config.jwt.cookieOptionsRefresh);
    res.status(201).json({ user });
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
    let user = await User.findByUsername(username);
    if (!user) {
      user = await User.findByEmail(username);
    }
    const passwordHash = user?.userAuth?.passwordHash || user?.passwordHash;
    if (!user || !passwordHash)
      throw new CustomError("Invalid credentials", 401);

    const valid = await AuthService.comparePassword(password, passwordHash);
    if (!valid) throw new CustomError("Invalid credentials", 401);

    await User.setOnline(user.id);

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    const safeUser = shapeUserForClient(await User.findById(user.id));

    res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
    res.cookie("refresh_token", refreshToken, config.jwt.cookieOptionsRefresh);
    res.json({ user: safeUser });
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
    // Clear auth cookies to end session client-side.
    res.clearCookie("jwt_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
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
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) throw new CustomError("refresh token is required", 401);

    const decoded = AuthService.verifyRefreshToken(refreshToken);
    if (!decoded)
      throw new CustomError("Invalid or expired refresh token", 401);

    const user = await User.findById(decoded.id);
    if (!user) throw new CustomError("User not found", 401);

    const accessToken = AuthService.generateAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user);

    res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
    res.cookie(
      "refresh_token",
      newRefreshToken,
      config.jwt.cookieOptionsRefresh,
    );
    res.json({ message: "Token refreshed successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
export const me = async (req, res) =>
  res.json({ user: shapeUserForClient(req.user) });

/**
 * OAuth callback (Google / GitHub)
 *
 * Redirects to the frontend callback route with tokens in the URL fragment.
 * Fragments are processed client-side and are not sent back to the server.
 */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  const frontendOrigin = config.frontendUrl;

  const payload = encodeURIComponent(JSON.stringify({}));
  const callbackUrl = `${frontendOrigin}/oauth-callback#${payload}`;

  res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
  res.cookie("refresh_token", refreshToken, config.jwt.cookieOptionsRefresh);
  res.redirect(302, callbackUrl);
};
