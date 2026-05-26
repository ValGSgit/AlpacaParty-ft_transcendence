import { randomUUID } from "crypto";
import { debug } from "#lib/logger.js";
import { AlpacaRoadMatch } from "./AlpacaRoadMatch.js";
import { SpitRoyalMatch } from "./SpitRoyaleMatch.js";

const GAME_REGISTRY = {
  2: SpitRoyalMatch,
  4: AlpacaRoadMatch,
};

// Max concurrent players per game type — used by join/create gating.
const PLAYER_CAP = {
  2: 10, // SpitRoyale: up to 10 players in the arena.
  4: 4,  // AlpacaRoad: 4 lanes, 4 players max.
};

export class MatchManager {
  constructor(ioNamespace) {
    this.io = ioNamespace;
    this.matches = new Map();
    this.playerToMatch = new Map();

    this.setupListeners();
  }

  broadcastPublicRooms() {
    const publicRooms = [];
    for (const match of this.matches.values()) {
      const typeKey = Number(
        Object.keys(GAME_REGISTRY).find((k) => GAME_REGISTRY[k] === match.constructor),
      );
      const cap = PLAYER_CAP[typeKey];
      const acceptingNew =
        (typeKey === 4 && match.status === 'LOBBY') ||
        (typeKey === 2 && match.status === 'PLAYING');
      if (acceptingNew && match.players.size > 0 && match.players.size < cap) {
        const levels = Array.from(match.players.values())
          .map((player) => Number(player.level) || 1)
          .filter((level) => Number.isFinite(level));
        const averageLevel = levels.length
          ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
          : 1;
        publicRooms.push({
          id: match.matchId,
          name: match.roomName,
          playerCount: match.players.size,
          gameType: typeKey,
          averageLevel,
        });
      }
    }
    this.io.emit('available_rooms', publicRooms);
  }

  setupListeners() {
    this.io.on('connection', (socket) => {
      this.broadcastPublicRooms();

      const leaveCurrentRoom = () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match) {
            match.removePlayer(socket.id);
            if (match.players.size === 0) {
              match.stop();
              this.matches.delete(matchId);
            }
          }
          this.playerToMatch.delete(socket.id);
        }
      };

      socket.on('create_room', ({ name, color, gameType }) => {
        debug(`BACKEND: Received create_room request from ${name}`);

        const typeKey = Number(gameType);
        const MatchClass = GAME_REGISTRY[typeKey];
        if (!MatchClass) {
          return socket.emit('join_error', { reason: 'invalid_game_type' });
        }

        leaveCurrentRoom();

        const roomId = randomUUID();
        const roomName = `${name}'s Room`;
        const match = new MatchClass(roomId, this.io, roomName, () => {
          this.broadcastPublicRooms();
        });

        this.matches.set(roomId, match);
        this.playerToMatch.set(socket.id, roomId);
        socket.emit('join_success', { roomId, roomName, gameType: typeKey });
        match.addPlayer(socket, name, color);
        this.broadcastPublicRooms();
      });

      socket.on('join_room', ({ name, roomId, color }) => {
        const match = this.matches.get(roomId);
        if (!match) return socket.emit('join_error', { reason: 'room_not_found' });

        const typeKey = Number(
          Object.keys(GAME_REGISTRY).find((k) => GAME_REGISTRY[k] === match.constructor),
        );
        const cap = PLAYER_CAP[typeKey];
        const acceptingNew =
          (typeKey === 4 && match.status === 'LOBBY') ||
          (typeKey === 2 && match.status === 'PLAYING');
        if (!acceptingNew || match.players.size >= cap) {
          return socket.emit('join_error', { reason: 'lobby_full' });
        }

        leaveCurrentRoom();
        this.playerToMatch.set(socket.id, roomId);
        socket.emit('join_success', { roomId, roomName: match.roomName, gameType: typeKey });
        match.addPlayer(socket, name, color);
        this.broadcastPublicRooms();
      });

      socket.on('leave_room', () => {
        leaveCurrentRoom();
        this.broadcastPublicRooms();
      })

      // ── Helpers for the per-event handlers below ─────────────────
      //
      // Every game event has the same dispatch pattern: look up the match
      // by socket, verify the handler exists, then invoke it. Hand-inlining
      // this six times bred subtle copy-paste bugs (forgotten typeof checks,
      // mismatched delete order). One helper, one place to read.
      const dispatch = (handlerName, ...args) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (!matchId) return;
        const match = this.matches.get(matchId);
        if (!match) return;
        const fn = match[handlerName];
        if (typeof fn !== 'function') return;
        fn.call(match, socket.id, ...args);
      };

      // Inbound socket payloads are untrusted. Shape-guard before dispatch
      // so the match classes can assume well-typed inputs. A bad payload is
      // dropped silently — a cheating/buggy client doesn't get a 4xx.
      const isObject = (v) => v !== null && typeof v === 'object';
      const isFiniteN = (v) => typeof v === 'number' && Number.isFinite(v);
      const isPlayerInput = (p) =>
        isObject(p) && isFiniteN(p.x) && isFiniteN(p.y) && isFiniteN(p.z) && isFiniteN(p.angle);
      const isSpitDirection = (p) =>
        isObject(p) && isFiniteN(p.x) && isFiniteN(p.y) && isFiniteN(p.z);

      socket.on('ready_toggle', (payload) => {
        const isReady = !!(payload && payload.isReady);
        dispatch('toggleReady', isReady);
      });

      socket.on('player_hit',          () => dispatch('handlePlayerHit'));
      socket.on('player_hit_complete', () => dispatch('handlePlayerHitComplete'));
      socket.on('player_jump',         () => dispatch('handlePlayerJump'));
      socket.on('player_active',       () => dispatch('handleActive'));

      socket.on('player_spit', (data) => {
        if (!isObject(data) || !isSpitDirection(data.direction)) return;
        dispatch('handlePlayerSpit', data.direction);
      });

      socket.on('player_input', (data) => {
        if (!isPlayerInput(data)) return;
        dispatch('handlePlayerInput', data);
      });

      socket.on('spit_hit', (payload) => {
        if (!isObject(payload)) return;
        const targetId = payload.targetId;
        // Socket ids are strings; reject anything else outright.
        if (typeof targetId !== 'string' || !targetId) return;
        dispatch('handleSpitHit', targetId);
      });

      // Disconnect: tear down the socket's room membership, free the match if
      // it just emptied. The previous version called playerToMatch.delete()
      // twice on the success path (once inside, once outside the `if (match)`
      // branch) — flatten to a single delete after the optional cleanup.
      socket.on('disconnect', () => {
        debug('BACKEND: Receive disconnect request');
        const matchId = this.playerToMatch.get(socket.id);
        if (!matchId) return;

        const match = this.matches.get(matchId);
        if (match) {
          match.removePlayer(socket.id);
          if (match.players.size <= 0) {
            match.stop();
            this.matches.delete(matchId);
          }
        }
        this.playerToMatch.delete(socket.id);
        this.broadcastPublicRooms();
      });
    });
  }
}