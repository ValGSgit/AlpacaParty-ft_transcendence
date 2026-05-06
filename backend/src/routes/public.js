/**
 * Public API Routes — /api/public  (API key required)
 * @owner ValGSgit
 *
 * Rate limited. Requires X-API-Key header.
 *
 * Endpoints:
 *   GET  /api/public/users
 *   GET  /api/public/users/:id
 *   GET  /api/public/posts
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { requireApiKey } from "../middleware/apiKey.js";
import {
  listUsers,
  getUser,
  getPosts,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/publicApiController.js";
import { idParamValidation } from "../validators/contentValidator.js";
import { checkValidation } from "../validators/validatorUtils.js";
import { limitValidation } from "#validators/limitValidator.js";
import {
  postCreateValidation,
  postUpdateValidation,
} from "#validators/publicApiValidator.js";
import config from "#config/index.js";

const router = express.Router();

// ── Documentation endpoint — no auth required ───────────────
router.get("/", (_req, res) => {
  res.json({
    name: "AlpacaParty Public API",
    version: "1.0",
    authentication: "X-API-Key header required (X-API-Key: <your-key>)",
    rateLimit: "30 requests per minute",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/users",
        description: "List public users",
        params: "search, limit, offset, anonymized",
      },
      {
        method: "GET",
        path: "/api/public/users/:id",
        description: "Get a public user profile",
        params: "anonymized",
      },
      {
        method: "GET",
        path: "/api/public/leaderboard",
        description: "Game leaderboard",
        params: "gameType, limit, offset, anonymized",
      },
      {
        method: "GET",
        path: "/api/public/posts",
        description: "Public feed posts",
        params: "limit, offset, anonymized",
      },
      {
        method: "GET",
        path: "/api/public/mock",
        description: "Anonymized mock dataset",
      },
      {
        method: "POST",
        path: "/api/public/posts",
        description: "Create a post (service-level)",
        body: "authorId, content, imageUrl?",
      },
      {
        method: "PUT",
        path: "/api/public/posts/:id",
        description: "Update a post (service-level)",
        body: "content?, imageUrl?",
      },
      {
        method: "DELETE",
        path: "/api/public/posts/:id",
        description: "Delete a post (service-level)",
      },
    ],
  });
});

router.use(requireApiKey);

/**
 * Rate Limit
 * need authentication first to get ratelimits per user
 */
router.use(
  rateLimit({
    windowMs: config.rateLimitPublicApi.windowMs,
    max: config.rateLimitPublicApi.max,
    message: { error: "Public API rate limit exceeded" },

    // create reate limit per user
    keyGenerator: (req) => {
      return req.userId;
    },
  }),
);

router.get("/users", limitValidation(100), checkValidation, listUsers);
router.get("/users/:id", idParamValidation(), checkValidation, getUser);
router.get("/posts", limitValidation(100), checkValidation, getPosts);
router.post("/posts", postCreateValidation(), checkValidation, createPost);
router.put("/posts/:id", postUpdateValidation(), checkValidation, updatePost);
router.delete("/posts/:id", idParamValidation(), checkValidation, deletePost);

export default router;
