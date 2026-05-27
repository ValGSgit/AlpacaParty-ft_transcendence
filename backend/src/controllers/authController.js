/**
 * Auth Controller — handles registration, login, logout, token refresh, OAuth
 * @owner ValGSgit
 */
import User, { shapeUserForClient } from "#models/User.js";
import GamificationService from "#services/GamificationService.js";
import AuthService from "#services/authService.js";
import { oauthTokensForUser } from "#services/oauthService.js";
import config from "#config/index.js";
import { customValidationResult } from "#validators/validatorUtils.js";
import CustomError from "#utils/CustomError.js";
import passport from "passport";

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

    GamificationService.onLogin(user.id).catch(() => {});
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

    res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
    res.cookie("refresh_token", refreshToken, config.jwt.cookieOptionsRefresh);
    res.json({ user: safeUser });
    GamificationService.onLogin(user.id).catch(() => {});
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

// Build the post-OAuth redirect base from the same host that served this
// callback request. Google/GitHub callback URLs must live on a real domain
// (e.g. *.nip.io) for the providers to accept them, but FRONTEND_URL may be
// configured for a different host (bare IP, localhost, etc.). Redirecting
// across hosts loses the just-set Set-Cookie because cookies are scoped to
// the origin that set them — the user lands logged-out and sees "OAuth
// failed" even though the account was created. Staying on the callback's
// own origin keeps the cookies in scope. The set of allowed origins is
// already constrained by CORS_ORIGINS, and the callback URL itself is
// fixed in the OAuth provider config, so this isn't an open-redirect sink.
//
// Host is read from X-Forwarded-Host first (covers proxies that rewrite the
// upstream `Host` header to a port-less hostname — nginx's $host strips the
// port, which silently breaks the redirect when the public origin uses a
// non-default port like :8443). Falls back to the literal Host header, then
// to FRONTEND_URL as last resort.
function oauthRedirectOrigin(req) {
  const xfHost = req.get("x-forwarded-host");
  const host = xfHost || req.get("host");
  if (!host) return config.frontendUrl;
  // `req.protocol` already honours X-Forwarded-Proto when `trust proxy` is on
  // (index.js sets it to 1). Treat http+req.secure as https for completeness.
  const proto = req.protocol === "http" && req.secure ? "https" : req.protocol;
  return `${proto}://${host}`;
}

// Custom-callback wrapper around passport.authenticate so OAuth failures
// (provider error, user denied consent, strategy throw) redirect back to the
// frontend's /login on the same host as the callback — instead of the
// backend's non-existent /login path or a hard-coded FRONTEND_URL that may
// be on a different host than the callback (which would drop the cookies).
function customOAuthCallback(strategy) {
  return (req, res, next) => {
    passport.authenticate(strategy, { session: false }, (err, user /* , info */) => {
      const frontendLogin = `${oauthRedirectOrigin(req)}/login`;
      if (err) {
        console.error(`${strategy} OAuth Error:`, err.message);
        return res.redirect(`${frontendLogin}?error=oauth_provider_error`);
      }
      if (!user) {
        return res.redirect(`${frontendLogin}?error=access_denied`);
      }
      req.user = user;
      next();
    })(req, res, next);
  };
}

export const googleAuth = customOAuthCallback("google");
export const githubAuth = customOAuthCallback("github");

/**
 * OAuth callback (Google / GitHub)
 *
 * Tokens are issued as httpOnly cookies; the redirect just brings the user
 * back to the SPA on the SAME host this callback was served from, so the
 * cookies we just set are still in scope on the next request.
 */
export const oauthCallback = (req, res) => {
  const { accessToken, refreshToken } = oauthTokensForUser(req.user);
  res.cookie("jwt_token", accessToken, config.jwt.cookieOptions);
  res.cookie("refresh_token", refreshToken, config.jwt.cookieOptionsRefresh);
  res.redirect(302, `${oauthRedirectOrigin(req)}/oauth-callback`);
};

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
