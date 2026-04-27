/**
 * Chat Controller — DM + group rooms
 * @owner ValGSgit
 */
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";

// ── Direct Messages ──────────────────────────────────────────────────────────

/** GET /api/chat/conversations */
export const listConversations = async (req, res, next) => {
  try {
    const conversations = await Message.getConversationsList(req.user.id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

/** GET /api/chat/dm/:userId */
export const getConversation = async (req, res, next) => {
  try {
    const otherId = Number(req.params.userId);
    if (isNaN(otherId))
      return res.status(400).json({ error: { message: "Invalid user ID" } });
    if (otherId === req.user.id)
      return res
        .status(400)
        .json({ error: { message: "Cannot have messages with yourself" } });
    const { limit = 50, offset = 0 } = req.query;
    const messages = await Message.getConversation(req.user.id, otherId, {
      limit: Number(limit),
      offset: Number(offset),
    });
    await Message.markAsRead(req.user.id, otherId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

/** GET /api/chat/unread */
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countUnread(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
};
