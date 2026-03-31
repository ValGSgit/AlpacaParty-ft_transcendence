/**
 * User Controller — profile viewing, editing, GDPR
 * @owner ValGSgit
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { InferenceClient } from "@huggingface/inference";
import User, { shapeUserForClient } from "#models/User.js";
import AuthService from "#services/authService.js";
import DataExportService from "#services/dataExportService.js";
import DataRequest from "#models/DataRequest.js";
import NotificationService from "#services/notificationService.js";
import config from "#config/index.js";
import { customValidationResult } from "#validators/validatorUtils.js";
import prisma from "#lib/prisma.js";
import CustomError from "#utils/CustomError.js";


const IMAGE_GENERATION_COST = 50;

/**
 * GET /api/users/me
 */
export const getMe = async (req, res) =>
  res.json({ user: shapeUserForClient(req.user) });

/**
 * PUT /api/users/me
 */
export const updateMe = async (req, res, next) => {
  const id = Number(req.user.id);
  const { username, email, bio, status, avatar, is_public } = req.body;

  try {
    customValidationResult(req).throw();

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username,
          id: { not: id },
        },
      });
      if (existingUser) throw new CustomError("User already exists", 400);
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: id },
        },
      });
      if (existingEmail) throw new CustomError("Email already exists", 400);
    }

    const updatedUser = await User.update(id, {
      username, email, bio, status, avatar,
      ...(is_public !== undefined && { isPublic: !!is_public }),
    });

    res.status(200).json({ user: shapeUserForClient(updatedUser) });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/me/password — change own password
 */
export const changePassword = async (req, res, next) => {
  try {
    customValidationResult(req).throw();

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: { message: "currentPassword and newPassword are required" },
      });
    }
    const id = Number(req.user.id);
    const currUser = await prisma.userAuth.findFirst({ where: { userId: id } });
    const valid = await AuthService.comparePassword(
      currentPassword,
      currUser.passwordHash,
    );
    if (!valid) throw new CustomError("Current password is incorrect", 401);

    const hash = await AuthService.hashPassword(newPassword);
    await User.updatePassword(id, hash);
    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id — view another user's public profile
 */
export const getUser = async (req, res, next) => {
  const id = Number(req.params.id);

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }
    const isPublic = user.userSettings?.isPublic ?? true;
    const reqIsAdmin = req.user?.isAdmin || req.user?.userSettings?.isAdmin;
    if (!isPublic && user.id !== req.user?.id && !reqIsAdmin) {
      return res.status(404).json({ error: { message: "User not found" } });
    }
    res.json({ user: shapeUserForClient(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users — list users
 */
export const listUsers = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const reqIsAdmin = req.user?.isAdmin || req.user?.userSettings?.isAdmin;
    const where = reqIsAdmin ? {} : { userSettings: { isPublic: true } };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: offset, take: limit, where, orderBy: { id: "asc" } }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, limit, offset });
  } catch (err) {
    next(err);
  }
};

// ── GDPR ──────────────────────────────────────────────────────────────────────

/** GET /api/users/me/export?format=json|csv|xml */
export const exportMyData = async (req, res, next) => {
  try {
    const format = ["json", "csv", "xml"].includes(req.query.format)
      ? req.query.format
      : "json";
    const { data, contentType, extension } =
      await DataExportService.exportUserData(req.user.id, format);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="alpacaparty-data.${extension}"`,
    );
    res.send(data);
  } catch (err) {
    next(err);
  }
};

/** POST /api/users/me/delete-request */
export const requestDeletion = async (req, res, next) => {
  try {
    const existing = await DataRequest.getByUser(req.user.id);
    const pending = existing.find(
      (r) => r.type === "delete" && r.status === "pending",
    );
    if (pending)
      return res
        .status(409)
        .json({ error: { message: "A deletion request is already pending" } });

    const request = await DataRequest.create({
      userId: req.user.id,
      type: "delete",
    });
    await NotificationService.notify({
      userId: req.user.id,
      type: "data_request",
      title: "Deletion Request Received",
      message:
        "Your account deletion request has been received and will be processed shortly.",
    });
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/me/data-requests */
export const listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataRequest.getByUser(req.user.id);
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/users/me */
export const deleteMe = async (req, res, next) => {
  try {
    const deleted = await User.deleteById(req.user.id);
    if (!deleted)
      return res.status(404).json({ error: { message: "User not found" } });
    return res.json({ message: "Account deleted", logout: true });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/users/me/generate-avatar */
export const generateAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const coins = user?.alpacaFarm?.coins ?? 0;
    if (!user || coins < IMAGE_GENERATION_COST) {
      return res.status(402).json({
        error: {
          message: `Insufficient coins. Image generation costs ${IMAGE_GENERATION_COST} coins.`,
        },
      });
    }
    const result = await _callHuggingFace(req, res, "avatar");
    if (!result) return;
    const { buffer, ext } = result;
    const filename = `avatar-${req.user.id}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);
    const avatarUrl = `/uploads/${filename}`;
    const updatedUser = await User.update(req.user.id, {
      avatar: avatarUrl,
      coins: coins - IMAGE_GENERATION_COST,
    });
    res.json({ user: shapeUserForClient(updatedUser), avatarUrl });
  } catch (err) {
    next(err);
  }
};

/** POST /api/users/me/generate-image */
export const generateImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const coins = user?.alpacaFarm?.coins ?? 0;
    if (!user || coins < IMAGE_GENERATION_COST) {
      return res.status(402).json({
        error: {
          message: `Insufficient coins. Image generation costs ${IMAGE_GENERATION_COST} coins.`,
        },
      });
    }
    const result = await _callHuggingFace(req, res, "image");
    if (!result) return;
    const { buffer, ext } = result;
    const filename = `generated-${req.user.id}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);
    await User.update(req.user.id, {
      coins: coins - IMAGE_GENERATION_COST,
    });
    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (err) {
    next(err);
  }
};

async function _callHuggingFace(req, res, mode) {
  const apiKey = config.huggingfaceApiKey;
  if (!apiKey) {
    res.status(503).json({
      error: { message: "Image generation service is not configured" },
    });
    return null;
  }
  const { prompt } = req.body;
  const safePrompt = typeof prompt === "string" ? prompt.slice(0, 200) : "";
  const fullPrompt =
    mode === "avatar"
      ? `cute cartoon alpaca avatar, profile picture, circular frame, colorful, ${safePrompt}, digital art, simple background`.slice(
          0,
          500,
        )
      : safePrompt || "a beautiful landscape with alpacas";

  try {
    const client = new InferenceClient(apiKey);
    const blob = await client.textToImage({
      provider: "nscale",
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: fullPrompt,
      parameters: { num_inference_steps: 5 },
    });
    const arrayBuffer = await blob.arrayBuffer();
    const ext =
      blob.type === "image/png"
        ? ".png"
        : blob.type === "image/jpeg"
          ? ".jpg"
          : ".webp";
    return { buffer: Buffer.from(arrayBuffer), ext };
  } catch (err) {
    console.error("HuggingFace API error:", err.message);
    res.status(502).json({
      error: { message: "Image generation service temporarily unavailable" },
    });
    return null;
  }
}
