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

/**
 * Compute Elo delta. Simple 32-K factor implementation.
 */
function calcElo(playerElo, opponentElo, result) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = result === "win" ? 1 : result === "loss" ? 0 : 0.5;
  return Math.round(playerElo + K * (score - expected));
}

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
  //initializeSpitRoyaleNamespace(io);
  const alpacaRoadNamespace = io.of('/alpaca-road');
  const manager = new MatchManager(alpacaRoadNamespace);

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

    // ── Game: matchmaking ────────────────────────────────────
    socket.on("game:queue", async ({ gameType = "spit_royale" }, ack) => {
      try {
        // Look for a waiting game
        let game = await Game.findWaiting(gameType, user.id);
        if (game) {
          game = await Game.joinGame(game.id, user.id);
          socket.join(`game:${game.id}`);
          io.to(`game:${game.id}`).emit("game:start", { game });
        } else {
          // Create a new waiting game
          game = await Game.create({ player1Id: user.id, gameType });
          socket.join(`game:${game.id}`);
          socket.emit("game:waiting", { gameId: game.id });
        }
        ack?.({ ok: true, game });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // ── Game: state sync (authoritative server relay) ──
    socket.on("game:state", async ({ gameId, state }) => {
      const game = await Game.findById(gameId);
      if (!game || ![game.player1Id, game.player2Id].includes(user.id)) return;
      socket.to(`game:${gameId}`).emit("game:state", { from: user.id, state });
    });

    socket.on(
      "game:finish",
      async ({ gameId, winnerId, player1Score, player2Score }, ack) => {
        try {
          const game = await Game.findById(gameId);
          if (!game || !["playing"].includes(game.status))
            return ack?.({ error: "Invalid game" });

          const finished = await Game.finishGame(gameId, {
            winnerId,
            player1Score,
            player2Score,
          });

          // Determine results for both players
          const p1Result =
            winnerId === game.player1Id
              ? "win"
              : winnerId === game.player2Id
                ? "loss"
                : "draw";
          const p2Result =
            p1Result === "win" ? "loss" : p1Result === "loss" ? "win" : "draw";

          // Update stats & award XP
          if (game.player2Id) {
            const [p1Stats, p2Stats] = await Promise.all([
              Game.getStats(game.player1Id, game.gameType),
              Game.getStats(game.player2Id, game.gameType),
            ]);
            const newP1Elo = calcElo(p1Stats.elo, p2Stats.elo, p1Result);
            const newP2Elo = calcElo(p2Stats.elo, p1Stats.elo, p2Result);

            await Promise.all([
              Game.updateStats(game.player1Id, game.gameType, p1Result),
              Game.updateStats(game.player2Id, game.gameType, p2Result),
              Game.updateElo(game.player1Id, game.gameType, newP1Elo),
              Game.updateElo(game.player2Id, game.gameType, newP2Elo),
            ]);
          }

          io.to(`game:${gameId}`).emit("game:finished", { game: finished });
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ error: err.message });
        }
      },
    );

    socket.on("game:forfeit", async ({ gameId }, ack) => {
      try {
        const game = await Game.findById(gameId);
        if (!game) return ack?.({ error: "Game not found" });
        const opponent =
          game.player1Id === user.id ? game.player2Id : game.player1Id;
        if (opponent) {
          await Game.finishGame(gameId, {
            winnerId: opponent,
            player1Score: game.player1Score,
            player2Score: game.player2Score,
          });
          io.to(`game:${gameId}`).emit("game:finished", {
            reason: "forfeit",
            forfeiter: user.id,
          });
        } else {
          await Game.cancelGame(gameId);
        }
        ack?.({ ok: true });
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
