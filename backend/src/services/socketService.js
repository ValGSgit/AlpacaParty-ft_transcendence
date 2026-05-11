/**
 * Socket Service — Real-time WebSocket hub
 * @owner ValGSgit
 *
 * Namespaces:
 *   /          — general: presence, notifications, DM chat
 *   /game      — in-game state, matchmaking, game chat
 *
 * Room conventions:
 *   user:{id}         — user's personal room
 *   dm:{minId}-{maxId} — DM conversation room
 *   room:{id}         — group chat room
 *   game:{id}         — game session room
 */
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import ChatRoom from "../models/ChatRoom.js";
import Friend from "../models/Friend.js";
import Game from "../models/Game.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { MatchManager } from "./MatchManager.js";
import NotificationService from "./notificationService.js";
import { socketAuthMiddleware } from "./socketAuth.js";

export function initializeSocket(httpServer, corsOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    connectionStateRecovery: { maxDisconnectionDuration: 30_000 },
  });

  // Share io with NotificationService so it can push real-time notifications
  NotificationService.setIo(io);
  const minigamesNamespace = io.of('/minigames');
  const manager = new MatchManager(minigamesNamespace);

  // ── Auth middleware ──────────────────────────────────────────
  io.engine.use(cookieParser());
  io.use(socketAuthMiddleware());

  // ── Presence tracking ────────────────────────────────────────
  const onlineSockets = new Map(); // userId -> Set<socketId>

  async function markOnline(userId, socketId) {
    if (!onlineSockets.has(userId)) {
      onlineSockets.set(userId, new Set());
      await User.setOnline(userId);
      io.emit("presence", { userId, isOnline: true });
    }
    onlineSockets.get(userId).add(socketId);
  }

  async function markOffline(userId, socketId) {
    const sockets = onlineSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        onlineSockets.delete(userId);
        await User.setOffline(userId);
        io.emit("presence", { userId, isOnline: false });
      }
    }
  }

  // ── Connection handler ───────────────────────────────────────
  io.on("connection", async (socket) => {
    const { user } = socket;

    try {
      // Join personal room
      socket.join(`user:${user.id}`);
      await markOnline(user.id, socket.id);

      // Join all group chat rooms the user belongs to
      const rooms = await ChatRoom.getUserRooms(user.id);
      for (const room of rooms) {
        socket.join(`room:${room.id}`);
      }

      console.log(`[socket] ${user.username} connected (${socket.id})`);
    } catch (err) {
      // console.error("[socket] connection setup failed:", err.message);
      socket.disconnect(true);
      return;
    }

    // ── Direct Messages ──────────────────────────────────────
    socket.on("dm:send", async ({ receiverId, content }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ error: "Empty message" });
        if (Number(receiverId) === user.id)
          return ack?.({ error: "Cannot send a message to yourself" });
        // Prevent sending messages when either user has blocked the other.
        const blocked = await Friend.isBlockedBetween(
          user.id,
          Number(receiverId),
        );
        if (blocked)
          return ack?.({
            error: "Cannot send message: blocked or you have blocked this user",
          });
        const msg = await Message.create({
          senderId: user.id,
          receiverId,
          content: content.trim(),
        });

        const dmRoom = `dm:${Math.min(user.id, receiverId)}-${Math.max(user.id, receiverId)}`;
        socket.join(dmRoom);

        // Map to snake_case for frontend compatibility
        const shaped = {
          id: msg.id,
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          content: msg.content,
          is_read: msg.isRead,
          created_at: msg.createdAt,
          sender_username: user.username,
          sender_avatar: user.avatar,
        };

        // Send to receiver's personal room
        io.to(`user:${receiverId}`).emit("dm:message", shaped);
        // Echo back to sender
        socket.emit("dm:message", shaped);

        // Notification (non-blocking)
        NotificationService.newMessage(receiverId, user.username).catch(
          () => { },
        );

        ack?.({ ok: true, message: shaped });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("dm:read", async ({ senderId }) => {
      await Message.markAsRead(user.id, senderId).catch(() => { });
    });

    // ── Group Chat Rooms ─────────────────────────────────────
    socket.on("room:join", async ({ roomId }, ack) => {
      try {
        const isMember = await ChatRoom.isMember(roomId, user.id);
        if (!isMember) return ack?.({ error: "Not a member of this room" });
        socket.join(`room:${roomId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("room:send", async ({ roomId, content }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ error: "Empty message" });
        const isMember = await ChatRoom.isMember(roomId, user.id);
        if (!isMember) return ack?.({ error: "Not a member" });

        const msg = await ChatRoom.sendMessage({
          roomId,
          senderId: user.id,
          content: content.trim(),
        });
        const shaped = {
          id: msg.id,
          room_id: msg.roomId ?? roomId,
          sender_id: msg.senderId,
          content: msg.content,
          created_at: msg.createdAt,
          sender_username: user.username,
          sender_avatar: user.avatar,
        };
        io.to(`room:${roomId}`).emit("room:message", shaped);
        ack?.({ ok: true, message: shaped });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // ── Alpaca farm data sync (offline -> server) ────────────
    socket.on("farm:save", async ({ farmData }, ack) => {
      try {
        const farm = await Game.updateFarm(user.id, farmData);
        ack?.({ ok: true, farm });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("farm:load", async (ack) => {
      try {
        const farm = await Game.getFarm(user.id);
        ack?.({ ok: true, farm });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      console.log(`[socket] ${user.username} disconnected: ${reason}`);
      await markOffline(user.id, socket.id);
    });
  });

  return io;
}

export default initializeSocket;
