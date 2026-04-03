/**
 * AI Controller — Hugging Face image generation
 * @owner ValGSgit
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { InferenceClient } from "@huggingface/inference";
import User, { shapeUserForClient } from "#models/User.js";
import config from "#config/index.js";

const IMAGE_GENERATION_COST = 50;

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
