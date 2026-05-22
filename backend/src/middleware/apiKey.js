/**
 * Public API Key Middleware
 * @owner ValGSgit
 *
 * Header:  X-API-Key: <key>
 */
import CustomError from "#utils/CustomError.js";
import User from "../models/User.js";
import AuthService from "../services/authService.js";

export const requireApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) throw new CustomError("No api key provided", 401);
    const decoded = AuthService.verifyPublicApiToken(apiKey);
    if (!decoded) throw new CustomError("Invalid or expired api key", 401);
    const userId = await User.findByApiKey(apiKey);
    if (!userId) throw new CustomError("Invalid or revoked api key", 401);

    // If a browser session cookie is also present, the API key must belong to
    // that same user — prevents using another user's key from an authenticated
    // session (e.g. Swagger UI with a stolen/borrowed key).
    const sessionToken = req.cookies?.jwt_token;
    if (sessionToken) {
      const session = AuthService.verifyToken(sessionToken);
      if (session && session.id !== userId) {
        throw new CustomError(
          "API key does not belong to the authenticated session",
          403,
        );
      }
    }

    req.userId = userId;
    next();
  } catch (err) {
    next(err);
  }
};
