/**
 * User Controller — profile viewing, editing, GDPR
 * @owner ValGSgit
 */
import User, { shapeUserForClient } from "#models/User.js";
import Friend from "#models/Friend.js";
import AuthService from "#services/authService.js";
import DataExportService from "#services/dataExportService.js";
import DataRequest from "#models/DataRequest.js";
import NotificationService from "#services/notificationService.js";
import { randomUUID } from "crypto";
import config from "#config/index.js";
import CustomError from "#utils/CustomError.js";

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
    if (username) {
      const current = req.user?.username;
      if (username !== current) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && Number(existingUser.id) !== id) {
          return res
            .status(409)
            .json({ error: { message: "Username already taken" } });
        }
      }
    }

    if (email) {
      const current = req.user?.email;
      if (email !== current) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail && Number(existingEmail.id) !== id) {
          return res
            .status(409)
            .json({ error: { message: "Email already registered" } });
        }
      }
    }

    const updatedUser = await User.update(id, {
      username,
      email,
      bio,
      status,
      avatar,
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: { message: "currentPassword and newPassword are required" },
      });
    }
    const id = Number(req.user.id);
    const currUser = await User.findByIdWithPassword(id);
    const valid = await AuthService.comparePassword(
      currentPassword,
      currUser?.passwordHash || currUser?.userAuth?.passwordHash,
    );
    if (!valid)
      return res
        .status(401)
        .json({ error: { message: "Current password is incorrect" } });

    const { valid: newValid, errors } =
      AuthService.validatePassword(newPassword);
    if (!newValid) {
      return res.status(400).json({
        error: { message: errors.join(". ") },
        errors: { newPassword: errors.join(". ") },
      });
    }

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

    // Return 404 (not 403) when either side has blocked the other — don't
    // disclose existence to a user who was blocked.
    if (req.user && user.id !== req.user.id) {
      const blocked = await Friend.isBlockedBetween(req.user.id, user.id);
      if (blocked) {
        return res.status(404).json({ error: { message: "User not found" } });
      }
    }

    const isPublic = user.userSettings?.isPublic;
    if (!isPublic && user.id !== req.user?.id) {
      const areFriends = await Friend.areFriends(req.user?.id, user.id);
      if (!areFriends) {
        // Include minimal public data so the frontend can render a locked card.
        return res.status(403).json({
          error: { message: "This profile is private" },
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isOnline: user.isOnline,
            isPrivate: true,
          },
        });
      }
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
    const pageSize =
      Number(req.query.pageSize) || Number(req.query.limit) || 50;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(pageSize, 100);
    const offset = Number(req.query.offset) || Math.max((page - 1) * limit, 0);
    const search = req.query.search ? String(req.query.search).trim() : "";

    const users = search
      ? await User.search(req.user.id, search, { limit })
      : await User.findAll({ limit, offset, currentUserId: req.user.id });
    const visibleUsers = users.filter((u) => {
      const isPublic = u.userSettings?.isPublic ?? u.isPublic ?? true;
      return isPublic || Number(u.id) === Number(req.user.id);
    });
    const total = await User.count();

    res.json({
      users: visibleUsers,
      total,
      limit,
      offset,
      pageSize: limit,
      currentPage: page,
    });
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

// ── Public API Key Management ────────────────────────────────────────────────

/**
 * GET /api/users/me/api-key
 *
 * Returns the caller's stored API key, or `{ apiKey: null }` when none exists.
 * "No key yet" is a valid state for an authenticated user — not an error —
 * so we respond 200 to avoid spurious console errors on the Settings page.
 */
export const getApiKey = async (req, res, next) => {
  try {
    const apiKey = await User.getApiKey(req.user.id);
    res.json({ apiKey: apiKey || null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/me/api-key
 * Generates (or regenerates) an API key for the authenticated user.
 * Returns the full key — this is the only time it is returned in full.
 */
export const generateApiKey = async (req, res, next) => {
  try {
    if (!config.jwt.publicApiSecret) {
      return next(new CustomError("Public API secret is not configured", 500));
    }
    const publiApiToken = AuthService.generatePublicApiToken(req.user);
    await User.setApiKey(req.user.id, publiApiToken);
    res.status(201).json({ apiKey: publiApiToken });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/me/api-key
 * Revokes the current API key for the authenticated user.
 */
export const revokeApiKey = async (req, res, next) => {
  try {
    await User.revokeApiKey(req.user.id);
    res.json({ message: "API key revoked" });
  } catch (err) {
    next(err);
  }
};
