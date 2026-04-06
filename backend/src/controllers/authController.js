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
    let user = await User.findByUsername(username);
    if (!user) {
      user = await User.findByEmail(username);
    }
    const passwordHash = user?.userAuth?.passwordHash || user?.passwordHash;
    if (!user || !passwordHash)
      throw new CustomError("Invalid credentials", 401);

    const valid = await AuthService.comparePassword(
      password,
      passwordHash,
    );
    if (!valid) throw new CustomError("Invalid credentials", 401);

    await User.setOnline(user.id);

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    const safeUser = shapeUserForClient(await User.findById(user.id));

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

    const user = await User.findById(decoded.id);
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

/**
 * OAuth callback (Google / GitHub)
 *
 * Delivers tokens via an auto-submitting HTML page that uses
 * window.postMessage to hand the tokens to the opener/parent window.
 * This avoids placing tokens in the URL (query params appear in server
 * logs, Referer headers, and browser history).
 */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  const frontendOrigin = config.frontendUrl;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html><head><title>Authenticating…</title></head>
<body>
<script>
(function() {
  var data = ${JSON.stringify({ accessToken, refreshToken })};
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth-callback', payload: data }, ${JSON.stringify(frontendOrigin)});
    window.close();
  } else {
    window.location.replace(${JSON.stringify(frontendOrigin)} + '/oauth-callback#' + encodeURIComponent(JSON.stringify(data)));
  }
})();
</script>
<noscript>Authentication requires JavaScript.</noscript>
</body></html>`);
};
