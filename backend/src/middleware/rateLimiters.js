/**
 * Per-user (authenticated) and per-IP (anonymous) rate limiters for the
 * user-generated content surface: posts, comments, chat, uploads, friend
 * requests. Applied per-route so a user abusing one
 * endpoint does not starve others.
 */
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Authenticated requests key on user id; anonymous ones fall back to IP.
// express-rate-limit v8 requires the ipKeyGenerator helper for the IP path so
// IPv6 addresses are normalised to their /64 subnet — without it an IPv6 client
// could rotate the low 64 bits to sidestep the limit (ERR_ERL_KEY_GEN_IPV6).
const userKey = (req) =>
  req.user?.id ? `u:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`;

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: { error: { message } },
  });

export const postWriteLimiter     = make(60_000,  10, "Too many posts — slow down.");
export const commentWriteLimiter  = make(60_000,  30, "Too many comments — slow down.");
export const likeLimiter          = make(60_000, 120, "Too many like/unlike actions.");
export const uploadLimiter        = make(60_000,  20, "Too many uploads — try again in a minute.");
export const chatSendLimiter      = make(10_000,  20, "Sending messages too fast.");
export const friendRequestLimiter = make(60_000,  20, "Too many friend requests — slow down.");
export const helpdeskLimiter      = make(60_000,  20, "Too many help desk messages — slow down.");
export const apiKeyRegenerateLimiter = make(3_600_000, 3, "Too many API key regenerations — try again in an hour.");
