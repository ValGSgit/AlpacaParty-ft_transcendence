/**
 * Chat Controller — DM + group rooms
 * @owner ValGSgit
 */
import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';

// ── Direct Messages ──────────────────────────────────────────────────────────

/** GET /api/chat/conversations */
export const listConversations = async (req, res, next) => {
  try {
    const conversations = await Message.getConversationsList(req.user.id);
    res.json({ conversations });
  } catch (err) { next(err); }
};

/** GET /api/chat/dm/:userId */
export const getConversation = async (req, res, next) => {
  try {
    const otherId = Number(req.params.userId);
    if (!Number.isFinite(otherId) || otherId <= 0)
      return res.status(400).json({ error: { message: 'Invalid user ID' } });
    if (otherId === req.user.id) return res.status(400).json({ error: { message: 'Cannot message yourself' } });
    const { limit = 50, offset = 0 } = req.query;
    const messages = await Message.getConversation(req.user.id, otherId, {
      limit: Number(limit), offset: Number(offset),
    });
    await Message.markAsRead(req.user.id, otherId);
    res.json({ messages });
  } catch (err) { next(err); }
};

/** GET /api/chat/unread */
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countUnread(req.user.id);
    res.json({ count });
  } catch (err) { next(err); }
};

// ── Group Rooms ───────────────────────────────────────────────────────────────

/** GET /api/chat/rooms */
export const listRooms = async (req, res, next) => {
  try {
    const rooms = await ChatRoom.getUserRooms(req.user.id);
    res.json({ rooms });
  } catch (err) { next(err); }
};

/** POST /api/chat/rooms */
export const createRoom = async (req, res, next) => {
  try {
    const { name, isPrivate } = req.body;
    const room = await ChatRoom.create({ name: name.trim(), ownerId: req.user.id, isPrivate: !!isPrivate });
    res.status(201).json({ room });
  } catch (err) { next(err); }
};

/** GET /api/chat/rooms/:id/messages */
export const getRoomMessages = async (req, res, next) => {
  try {
    const isMember = await ChatRoom.isMember(Number(req.params.id), req.user.id);
    if (!isMember) return res.status(403).json({ error: { message: 'Not a member of this room' } });
    const { limit = 50, offset = 0 } = req.query;
    const messages = await ChatRoom.getMessages(Number(req.params.id), { limit: Number(limit), offset: Number(offset) });
    res.json({ messages });
  } catch (err) { next(err); }
};

/** POST /api/chat/rooms/:id/members */
export const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const room = await ChatRoom.findById(Number(req.params.id));
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });
    if (room.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: { message: 'Only the room owner can add members' } });
    }
    const member = await ChatRoom.addMember(room.id, Number(userId));
    res.status(201).json({ member });
  } catch (err) { next(err); }
};

/** DELETE /api/chat/rooms/:id/members/:userId */
export const removeMember = async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });
    const isSelf = targetUserId === req.user.id;
    if (!isSelf && room.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: { message: 'Only the room owner can remove other members' } });
    }
    await ChatRoom.removeMember(roomId, targetUserId);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};

/** DELETE /api/chat/rooms/:id */
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await ChatRoom.findById(Number(req.params.id));
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });
    if (room.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: { message: 'Not the room owner' } });
    }
    await ChatRoom.delete(room.id);
    res.json({ message: 'Room deleted' });
  } catch (err) { next(err); }
};
