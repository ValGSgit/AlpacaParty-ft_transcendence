/**
 * Auth Controller — handles registration, login, logout, token refresh
 * @owner ValGSgit
 */
import User, { shapeUserForClient } from "#models/User.js";
import GamificationService from "#services/GamificationService.js";
import AuthService from "#services/authService.js";
import config from "#config/index.js";
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

    await GamificationService.onLogin(user.id);

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
 * Username or email — POST body may put either in the `username` field.
 * Returns the user record (with userAuth join) or null.
 */
async function findLoginUser(identifier) {
  const byName = await User.findByUsername(identifier);
  if (byName) return byName;
  return User.findByEmail(identifier);
}

/**
 * Password hash may live on the joined userAuth row (current schema) or
 * on the user row itself (legacy). Return the first one found, or null.
 */
function extractPasswordHash(user) {
  if (user.userAuth && user.userAuth.passwordHash) return user.userAuth.passwordHash;
  if (user.passwordHash) return user.passwordHash;
  return null;
}

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    customValidationResult(req).throw();

    const { username, password } = req.body;

    const user = await findLoginUser(username);
    if (!user) throw new CustomError("Invalid credentials", 401);

    const passwordHash = extractPasswordHash(user);
    if (!passwordHash) throw new CustomError("Invalid credentials", 401);

    const valid = await AuthService.comparePassword(password, passwordHash);
    if (!valid) throw new CustomError("Invalid credentials", 401);

    if (user.isBanned) throw new CustomError("Account is banned", 403);

    await User.setOnline(user.id);

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    const safeUser = shapeUserForClient(await User.findById(user.id));

    await GamificationService.onLogin(user.id);

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
      await User.setOffline(req.user.id).catch(() => {});
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

    const user = await User.findByIdWithPassword(decoded.id);
    if (!user) throw new CustomError("User not found", 401);

    if (user.isBanned) throw new CustomError("Account is banned", 403);

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
  res.json({ user: req.user ? shapeUserForClient(req.user) : null });

/**
 * GET /api/auth/validate
 * Validates username and email availability for registration
 * Query params:
 *   - type: 'username' or 'email'
 *   - value: the value to check
 */
export const validate = async (req, res, next) => {
  try {
    const { type, value } = req.query;

    if (!type || !value) {
      return res.status(400).json({
        valid: false,
        message: "Missing type or value parameter",
      });
    }

    if (type === "username") {
      // Validate format: 3-32 chars, [A-Za-z0-9_-]
      if (value.length < 3 || value.length > 32) {
        return res.json({
          valid: false,
          message: "Username must be 3-32 characters",
        });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return res.json({
          valid: false,
          message: "Username can only contain letters, numbers, hyphens, and underscores",
        });
      }
      // Check uniqueness
      const existing = await User.findByUsername(value);
      if (existing) {
        return res.json({
          valid: false,
          message: "Username already taken",
        });
      }
      return res.json({ valid: true, message: "Username available" });
    }

    if (type === "email") {
      // Validate format
      if (!/\S+@\S+\.\S+/.test(value)) {
        return res.json({
          valid: false,
          message: "Invalid email address",
        });
      }
      // Check uniqueness
      const existing = await User.findByEmail(value);
      if (existing) {
        return res.json({
          valid: false,
          message: "Email already has an account",
        });
      }
      return res.json({ valid: true, message: "Email available" });
    }

    res.status(400).json({
      valid: false,
      message: "Invalid type parameter. Use 'username' or 'email'",
    });
  } catch (err) {
    next(err);
  }
};
