/**
 * User Controller — profile viewing, editing, GDPR
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/9
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { InferenceClient } from '@huggingface/inference';
import User from '../models/User.js';
import AuthService from '../services/authService.js';
import DataExportService from '../services/dataExportService.js';
import DataRequest from '../models/DataRequest.js';
import NotificationService from '../services/notificationService.js';
import config from '../config/index.js';

/**
 * GET /api/users/me — alias handled via auth/me, but also available here
 */
export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

/**
 * PUT /api/users/me — update own profile
 */
export const updateMe = async (req, res, next) => {
  try {
    const { username, email, bio, status, avatar, is_public, coins, upgrades, items, alpacas } = req.body;

    // Check username uniqueness if changing
    if (username && username !== req.user.username) {
      if (username.length < 3 || username.length > 32) {
        return res.status(400).json({ error: { message: 'Username must be 3-32 characters' } });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: { message: 'Username may only contain letters, numbers, hyphens and underscores' } });
      }
      const existing = await User.findByUsername(username);
      if (existing) {
        return res.status(409).json({ error: { message: 'Username already taken' } });
      }
    }

    // Check email uniqueness if changing
    if (email && email !== req.user.email) {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: { message: 'Email already registered' } });
      }
    }

    const updatedUser = await User.update(req.user.id, {
    username, email, bio, status, avatar, is_public, coins, upgrades, items, alpacas,
  });

    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/me/password — change own password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { message: 'currentPassword and newPassword are required' } });
    }

    const userWithPw = await User.findByIdWithPassword(req.user.id);
    const valid = await AuthService.comparePassword(currentPassword, userWithPw.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Current password is incorrect' } });
    }

    const { valid: pwValid, errors } = AuthService.validatePassword(newPassword);
    if (!pwValid) {
      return res.status(400).json({ error: { message: errors.join('. ') } });
    }

    const hash = await AuthService.hashPassword(newPassword);
    await User.updatePassword(req.user.id, hash);

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id — view another user's public profile
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    // Only the owner or admins can see non-public profiles
    if (!user.is_public && user.id !== req.user.id && !req.user.is_admin) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users — list / search users
 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let users;
    if (search) {
      users = await User.search(search, { limit: Number(limit) });
    } else {
      users = await User.findAll({ limit: Number(limit), offset: Number(offset) });
    }

    // Non-admin users only see public profiles (plus themselves)
    if (!req.user.is_admin) {
      users = users.filter(u => u.is_public || u.id === req.user.id);
    }

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// ── GDPR ──────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me/export?format=json|csv|xml
 */
export const exportMyData = async (req, res, next) => {
  try {
    const format = ['json', 'csv', 'xml'].includes(req.query.format) ? req.query.format : 'json';
    const { data, contentType, extension } = await DataExportService.exportUserData(req.user.id, format);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="alpacaparty-data.${extension}"`);
    res.send(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/me/delete-request
 * User requests account deletion (queued).
 */
export const requestDeletion = async (req, res, next) => {
  try {
    // Prevent duplicate pending requests
    const existing = await DataRequest.getByUser(req.user.id);
    const pending = existing.find((r) => r.type === 'delete' && r.status === 'pending');
    if (pending) {
      return res.status(409).json({ error: { message: 'A deletion request is already pending' } });
    }

    const request = await DataRequest.create({ userId: req.user.id, type: 'delete' });
    await NotificationService.notify({
      userId: req.user.id,
      type: 'data_request',
      title: 'Deletion Request Received',
      message: 'Your account deletion request has been received and will be processed shortly.',
    });
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/me/data-requests — list own data requests
 */
export const listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataRequest.getByUser(req.user.id);
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/me/generate-avatar — generate avatar via Hugging Face
 */
export const generateAvatar = async (req, res, next) => {
  try {
    const result = await _callHuggingFace(req, res, 'avatar');
    if (!result) return; // response already sent

    const { buffer, ext } = result;
    const filename = `avatar-${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);

    const avatarUrl = `/uploads/${filename}`;
    const updatedUser = await User.update(req.user.id, { avatar: avatarUrl });
    res.json({ user: updatedUser, avatarUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/me/generate-image — generate a full image via Hugging Face
 */
export const generateImage = async (req, res, next) => {
  try {
    const result = await _callHuggingFace(req, res, 'image');
    if (!result) return;

    const { buffer, ext } = result;
    const filename = `generated-${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;
    res.json({ imageUrl });
  } catch (err) {
    next(err);
  }
};

/** Shared helper for HuggingFace image generation */
async function _callHuggingFace(req, res, mode) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: { message: 'Image generation service is not configured' } });
    return null;
  }

  const { prompt } = req.body;
  const safePrompt = typeof prompt === 'string' ? prompt.slice(0, 200) : '';
  const fullPrompt = mode === 'avatar'
    ? `cute cartoon alpaca avatar, profile picture, circular frame, colorful, ${safePrompt}, digital art, simple background`.slice(0, 500)
    : safePrompt || 'a beautiful landscape with alpacas';

  try {
    const client = new InferenceClient(apiKey);
    const blob = await client.textToImage({
      provider: 'nscale',
      model: 'black-forest-labs/FLUX.1-schnell',
      inputs: fullPrompt,
      parameters: { num_inference_steps: 5 },
    });

    const arrayBuffer = await blob.arrayBuffer();
    const ext = blob.type === 'image/png' ? '.png'
      : blob.type === 'image/jpeg' ? '.jpg'
      : '.webp';

    return { buffer: Buffer.from(arrayBuffer), ext };
  } catch (err) {
    console.error('HuggingFace API error:', err.message);
    res.status(502).json({ error: { message: 'Image generation service temporarily unavailable' } });
    return null;
  }
}
