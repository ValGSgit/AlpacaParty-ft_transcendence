/**
 * User Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/9
 */
import express from "express";
import { authenticate } from "#middleware/auth.js";
import {
  getMe,
  updateMe,
  changePassword,
  getUser,
  listUsers,
  exportMyData,
  requestDeletion,
  listDataRequests,
  deleteMe,
  getApiKey,
  generateApiKey,
  revokeApiKey,
} from "#controllers/userController.js";
import { generateAvatar, generateImage } from "#controllers/aiController.js";
import {
  userPasswordValidation,
  userUpdateValidation,
} from "#validators/userValidator.js";
import {
  getFarmData,
  updateFarmData,
} from "#controllers/alpacaFarmController.js";

const router = express.Router();
router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my profile
 *     responses:
 *       200:
 *         description: Current user's full profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 *   put:
 *     tags: [Users]
 *     summary: Update my profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, minLength: 3, maxLength: 32, example: alpaca42 }
 *               bio: { type: string, maxLength: 500, nullable: true, example: "I love alpacas!" }
 *               status: { type: string, maxLength: 100, nullable: true, example: "Playing Spit Royale" }
 *               is_public: { type: boolean, example: true }
 *               avatar: { type: string, nullable: true, description: "URL to avatar image" }
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Validation error }
 *       409: { description: Username already taken }
 *   delete:
 *     tags: [Users]
 *     summary: Delete my account immediately (irreversible)
 *     responses:
 *       200:
 *         description: Account deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Account deleted" }
 */
router.get("/me", getMe);
router.get("/me/farmData", getFarmData);
router.put("/me", userUpdateValidation(), updateMe);
router.put("/me/farmData", updateFarmData);
router.delete("/me", deleteMe);

/**
 * @openapi
 * /users/me/password:
 *   put:
 *     tags: [Users]
 *     summary: Change my password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: OldPass123 }
 *               newPassword: { type: string, minLength: 8, example: NewPass456 }
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400: { description: Validation error or same password }
 *       401: { description: Current password is wrong }
 */
router.put("/me/password", userPasswordValidation(), changePassword);

/**
 * @openapi
 * /users/me/export:
 *   get:
 *     tags: [Users]
 *     summary: Export all my personal data (GDPR Article 20)
 *     description: Returns a JSON blob containing all data the platform holds about the authenticated user.
 *     responses:
 *       200:
 *         description: Full GDPR data export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile: { $ref: '#/components/schemas/User' }
 *                 posts: { type: array, items: { $ref: '#/components/schemas/Post' } }
 *                 messages: { type: array, items: { $ref: '#/components/schemas/Message' } }
 */
router.get("/me/export", exportMyData);

/**
 * @openapi
 * /users/me/delete-request:
 *   post:
 *     tags: [Users]
 *     summary: Submit a GDPR deletion request (admin reviews within 30 days)
 *     description: Softer alternative to `DELETE /users/me` — creates a pending deletion request reviewed by an admin.
 *     responses:
 *       201:
 *         description: Deletion request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Deletion request submitted" }
 *       409: { description: Pending request already exists }
 */
router.post("/me/delete-request", requestDeletion);

/**
 * @openapi
 * /users/me/data-requests:
 *   get:
 *     tags: [Users]
 *     summary: List my GDPR data requests and their status
 *     responses:
 *       200:
 *         description: List of data requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       type: { type: string, enum: [export, deletion] }
 *                       status: { type: string, enum: [pending, processing, completed, rejected] }
 *                       created_at: { type: string, format: date-time }
 */
router.get("/me/data-requests", listDataRequests);

/**
 * @openapi
 * /users/me/api-key:
 *   get:
 *     tags: [Users]
 *     summary: Get my Public API key (null if not yet generated)
 *     responses:
 *       200:
 *         description: API key (full value) or null
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey: { type: string, nullable: true, example: "ap_abc123..." }
 *   post:
 *     tags: [Users]
 *     summary: Generate (or regenerate) my Public API key
 *     description: |
 *       Returns the full key exactly once. Store it securely — subsequent GET calls
 *       also return the full key, but after navigating away you should treat it as
 *       partially hidden in the UI.
 *     responses:
 *       201:
 *         description: New API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey: { type: string, example: "ap_a1b2c3d4e5f6..." }
 *   delete:
 *     tags: [Users]
 *     summary: Revoke my Public API key
 *     responses:
 *       200:
 *         description: Key revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "API key revoked" }
 */
router.get("/me/api-key", getApiKey);
router.post("/me/api-key", generateApiKey);
router.delete("/me/api-key", revokeApiKey);

/**
 * @openapi
 * /users/me/generate-avatar:
 *   post:
 *     tags: [Users]
 *     summary: Generate an AI avatar image (costs 50 coins)
 *     description: |
 *       Uses Hugging Face FLUX.1-schnell to generate a custom alpaca-themed avatar.
 *       Costs **50 coins** per generation. The prompt is appended to a base avatar template.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt: { type: string, maxLength: 200, example: "Cute alpaca warrior in pixel art style" }
 *     responses:
 *       200:
 *         description: Avatar generated and set on user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *                 avatarUrl: { type: string, example: "/uploads/avatar-42-a1b2c3d4e5f6g7h8.png" }
 *       402:
 *         description: Insufficient coins (need 50)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Image generation service temporarily unavailable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Image generation service not configured
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/me/generate-avatar", generateAvatar);

/**
 * @openapi
 * /users/me/generate-image:
 *   post:
 *     tags: [Users]
 *     summary: Generate an AI image for posts (costs 50 coins)
 *     description: |
 *       Uses Hugging Face FLUX.1-schnell to generate an image from a text prompt.
 *       Costs **50 coins** per generation. The image is saved to `/uploads/` and can be
 *       attached to posts via the `imageUrl` field.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, maxLength: 200, example: "Alpaca riding a skateboard at sunset" }
 *     responses:
 *       200:
 *         description: Generated image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl: { type: string, example: "/uploads/generated-42-a1b2c3d4e5f6g7h8.jpg" }
 *       402:
 *         description: Insufficient coins (need 50)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Image generation service temporarily unavailable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Image generation service not configured
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/me/generate-image", generateImage);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Search / list users
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Partial username or email search
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get("/", listUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's public profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       404: { description: User not found or profile is private }
 */
router.get("/:id", getUser);

export default router;
