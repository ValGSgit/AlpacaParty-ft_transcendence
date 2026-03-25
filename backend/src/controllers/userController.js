/**
 * User Controller — profile viewing, editing, GDPR
 * @owner ValGSgit
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { InferenceClient } from '@huggingface/inference';
import User, { shapeUserForClient } from '../models/User.js';
import AuthService from '../services/authService.js';
import DataExportService from '../services/dataExportService.js';
import DataRequest from '../models/DataRequest.js';
import NotificationService from '../services/notificationService.js';
import Friend from '../models/Friend.js';
import config from '../config/index.js';

function sanitizeUserForViewer(user, viewer) {
  if (viewer.id === user.id || viewer.isAdmin) return user;
  const { id, username, avatar, bio, status, isPublic, isOnline, xp, level, lastSeen, createdAt, updatedAt } = user;
  return { id, username, avatar, bio, status, isPublic, isOnline, xp, level, lastSeen, createdAt, updatedAt };
}

/** GET /api/users/me */
export const getMe = async (req, res) => res.json({ user: shapeUserForClient(req.user) });

/** PUT /api/users/me */
export const updateMe = async (req, res, next) => {
  try {
    const { username, email, bio, status, avatar, is_public, coins, alpacas, items, upgrades } = req.body;

    if (bio !== undefined && String(bio).length > 500) {
      return res.status(400).json({ error: { message: 'Bio must be 500 characters or fewer' } });
    }
    if (status !== undefined && String(status).length > 200) {
      return res.status(400).json({ error: { message: 'Status must be 200 characters or fewer' } });
    }

    if (username && username !== req.user.username) {
      if (username.length < 3 || username.length > 32) {
        return res.status(400).json({ error: { message: 'Username must be 3-32 characters' } });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: { message: 'Username may only contain letters, numbers, hyphens and underscores' } });
      }
      const existing = await User.findByUsername(username);
      if (existing) return res.status(409).json({ error: { message: 'Username already taken' } });
    }

    if (email && email !== req.user.email) {
      if (email.length > 254) {
        return res.status(400).json({ error: { message: 'Email must be 254 characters or fewer' } });
      }
      const existing = await User.findByEmail(email);
      if (existing) return res.status(409).json({ error: { message: 'Email already registered' } });
    }

    const updatedUser = await User.update(req.user.id, {
      username, email, bio, status, avatar, coins, alpacas, items, upgrades,
      isPublic: is_public,  // body still sends is_public (frontend compat)
    });
    res.json({ user: shapeUserForClient(updatedUser) });
  } catch (err) { next(err); }
};

/** PUT /api/users/me/password */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { message: 'currentPassword and newPassword are required' } });
    }

    const userWithPw = await User.findByIdWithPassword(req.user.id);
    const valid = await AuthService.comparePassword(currentPassword, userWithPw.passwordHash);
    if (!valid) return res.status(401).json({ error: { message: 'Current password is incorrect' } });

    const { valid: pwValid, errors } = AuthService.validatePassword(newPassword);
    if (!pwValid) return res.status(400).json({ error: { message: errors.join('. ') } });

    const hash = await AuthService.hashPassword(newPassword);
    await User.updatePassword(req.user.id, hash);

    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};

/** GET /api/users/:id */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    const isOwner = user.id === req.user.id;
    if (!user.isPublic && !isOwner && !req.user.isAdmin) {
      const areFriends = await Friend.areFriends(req.user.id, user.id);
      if (!areFriends) return res.status(403).json({ error: { message: 'This profile is private' } });
    }

    res.json({ user: shapeUserForClient(sanitizeUserForViewer(user, req.user)) });
  } catch (err) { next(err); }
};

/** GET /api/users */
export const listUsers = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let users = search
      ? await User.search(search, { limit: Number(limit) })
      : await User.findAll({ limit: Number(limit), offset: Number(offset) });

    if (!req.user.isAdmin) {
      users = users.filter((u) => u.isPublic || u.id === req.user.id);
    }
    res.json({ users: users.map(shapeUserForClient) });
  } catch (err) { next(err); }
};

// ── GDPR ──────────────────────────────────────────────────────────────────────

/** GET /api/users/me/export?format=json|csv|xml */
export const exportMyData = async (req, res, next) => {
  try {
    const format = ['json', 'csv', 'xml'].includes(req.query.format) ? req.query.format : 'json';
    const { data, contentType, extension } = await DataExportService.exportUserData(req.user.id, format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="alpacaparty-data.${extension}"`);
    res.send(data);
  } catch (err) { next(err); }
};

/** POST /api/users/me/delete-request */
export const requestDeletion = async (req, res, next) => {
  try {
    const existing = await DataRequest.getByUser(req.user.id);
    const pending = existing.find((r) => r.type === 'delete' && r.status === 'pending');
    if (pending) return res.status(409).json({ error: { message: 'A deletion request is already pending' } });

    const request = await DataRequest.create({ userId: req.user.id, type: 'delete' });
    await NotificationService.notify({
      userId: req.user.id, type: 'data_request',
      title: 'Deletion Request Received',
      message: 'Your account deletion request has been received and will be processed shortly.',
    });
    res.status(201).json({ request });
  } catch (err) { next(err); }
};

/** GET /api/users/me/data-requests */
export const listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataRequest.getByUser(req.user.id);
    res.json({ requests });
  } catch (err) { next(err); }
};

/** DELETE /api/users/me */
export const deleteMe = async (req, res, next) => {
  try {
    const deleted = await User.deleteById(req.user.id);
    if (!deleted) return res.status(404).json({ error: { message: 'User not found' } });
    return res.json({ message: 'Account deleted', logout: true });
  } catch (err) { return next(err); }
};

/** POST /api/users/me/generate-avatar */
export const generateAvatar = async (req, res, next) => {
  try {
    const result = await _callHuggingFace(req, res, 'avatar');
    if (!result) return;
    const { buffer, ext } = result;
    const filename = `avatar-${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);
    const avatarUrl = `/uploads/${filename}`;
    const updatedUser = await User.update(req.user.id, { avatar: avatarUrl });
    res.json({ user: shapeUserForClient(updatedUser), avatarUrl });
  } catch (err) { next(err); }
};

/** POST /api/users/me/generate-image */
export const generateImage = async (req, res, next) => {
  try {
    const result = await _callHuggingFace(req, res, 'image');
    if (!result) return;
    const { buffer, ext } = result;
    const filename = `generated-${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(config.uploads.dir, filename);
    fs.mkdirSync(config.uploads.dir, { recursive: true });
    fs.writeFileSync(filepath, buffer);
    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (err) { next(err); }
};

async function _callHuggingFace(req, res, mode) {
  const apiKey = config.huggingfaceApiKey;
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
    const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/jpeg' ? '.jpg' : '.webp';
    return { buffer: Buffer.from(arrayBuffer), ext };
  } catch (err) {
    console.error('HuggingFace API error:', err.message);
    res.status(502).json({ error: { message: 'Image generation service temporarily unavailable' } });
    return null;
  }
}
