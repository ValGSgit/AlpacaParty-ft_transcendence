import { error } from "#lib/logger.js";
import { BaseMatch } from "./BaseMatch.js";
import Game from "../models/Game.js";
import GamificationService from "./GamificationService.js";

const ARENA_RADIUS = 25;
const PLAYER_RADIUS = 2;
const GAME_TYPE = 'spit_royale';
const MIN_RANKED_PLAYERS = 2;
// Server-authoritative anti-cheat constants. Without these a malicious client
// could emit spit_hit with any targetId and instantly kill the whole lobby.
const SPIT_COOLDOWN_MS = 500;
const SPIT_MAX_RANGE = 12;            // metres
const SPIT_VALID_FOR_MS = 1500;       // hit must follow a recent spit
const MAX_SPEED_MPS = 25;             // server-side speed clamp

export class SpitRoyalMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange);
    this.tickRate = 33;
    this.isPlaying = false;
    this.playersJoined = 0;
    this.finalized = false;
    // Require a second player so a lone alpaca waits in the lobby instead of starting alone.
    this.minPlayers = 2;
  }

  getValidSpawn() {
    for (let attempts = 0; attempts < 50; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (ARENA_RADIUS - 2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      let isOverlapping = false;
      for (const p of this.players.values()) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (Math.sqrt(dx * dx + dz * dz) < PLAYER_RADIUS * 2.5) {
          isOverlapping = true;
          break;
        }
      }
      if (!isOverlapping) return { x, z, angle: -angle };
    }
    return { x: 0, z: 0, angle: 0 };
  }

  // No addPlayer override: players join the LOBBY via BaseMatch.addPlayer and
  // ready up, exactly like Alpaca Road. The transition to PLAYING is driven by
  // BaseMatch.toggleReady → checkStart → start(). Spawns, the heartbeat and the
  // game_start signal are all deferred to start() — joining a room no longer
  // drops you straight into the arena with no ready screen.

  // Called by BaseMatch.checkStart() once every player in the lobby is ready.
  start() {
    if (this.status === 'PLAYING') return;
    this.status = 'PLAYING';
    this.isPlaying = true;
    this.playersJoined = this.players.size;
    this._ensureHeartbeat();

    // Assign spawns in iteration order so each one avoids the players placed
    // before it (getValidSpawn checks already-set positions). Each client gets
    // its own spawn with the game_start signal that ends the countdown.
    for (const [id, player] of this.players) {
      const spawn = this.getValidSpawn();
      player.x = spawn.x;
      player.y = 0;
      player.z = spawn.z;
      player.angle = spawn.angle;
      player.hp = 3;
      player.isDead = false;
      player.point = 0;
      this.namespace.to(id).emit('game_start', { spawn });
    }
  }

  removePlayer(socketId) {
    // Mark the leaver as dead BEFORE running the win check, then remove them
    // from the player map. The previous order mutated the player after
    // super.removePlayer() had already deleted them, so the mutation hit an
    // orphan reference and checkWinCondition could not see the change — a
    // mid-match leaver did not count toward the elimination total, blocking
    // last-alpaca-standing from firing when the last opponent ragequit.
    const player = this.players.get(socketId);
    if (player && !player.isDead) {
      player.isDead = true;
      this.eliminations = (this.eliminations || 0) + 1;
    }
    this.checkWinCondition();
    super.removePlayer(socketId);
  }

  handlePlayerInput(socketId, { x, y, z, angle }) {
    const player = this.players.get(socketId);
    if (!player || player.isDead) return;

    // Reject malformed payloads outright — clients are not trusted.
    const validNum = (n) => typeof n === "number" && Number.isFinite(n);

    if (validNum(x) && validNum(z)) {
      // Clamp to arena bounds.
      const r2 = x * x + z * z;
      const maxR = ARENA_RADIUS - PLAYER_RADIUS;
      if (r2 > maxR * maxR) return;

      // Speed-limit movement between consecutive inputs so a client can't
      // teleport across the arena.
      const now = Date.now();
      const dt = Math.max(0.001, (now - (player.lastInputAt || now)) / 1000);
      const step = Math.hypot(x - (player.x ?? 0), z - (player.z ?? 0));
      if (step > MAX_SPEED_MPS * dt * 1.5) return;
      player.lastInputAt = now;
      player.x = x;
      player.z = z;
    }
    if (validNum(y)) player.y = y;
    if (validNum(angle)) player.angle = angle;
  }

  handlePlayerSpit(socketId, direction) {
    const player = this.players.get(socketId);
    if (!player || player.isDead) return;
    const now = Date.now();
    if (now - (player.lastSpitAt || 0) < SPIT_COOLDOWN_MS) return;
    player.lastSpitAt = now;
    // Sanitise the direction so we forward {x, y, z} numbers only — never
    // store client objects on the player (they may include non-serialisable
    // bits that would crash hasBinary if re-broadcast).
    const safeDir = direction && typeof direction === 'object'
      ? { x: Number(direction.x) || 0, y: Number(direction.y) || 0, z: Number(direction.z) || 0 }
      : null;
    this.broadcast('player_spit', { ownerId: socketId, direction: safeDir });
  }

  handleSpitHit(ownerId, targetId) {
    const owner = this.players.get(ownerId);
    const target = this.players.get(targetId);
    if (!owner || owner.isDead || !target || target.isDead) return;
    // Hit must follow a recent spit by the owner — defeats clients that just
    // call spit_hit on every tick.
    const now = Date.now();
    if (!owner.lastSpitAt || now - owner.lastSpitAt > SPIT_VALID_FOR_MS) return;
    // Range check — the server holds the authoritative positions.
    const dx = (target.x ?? 0) - (owner.x ?? 0);
    const dz = (target.z ?? 0) - (owner.z ?? 0);
    if (Math.hypot(dx, dz) > SPIT_MAX_RANGE) return;

    // Each spit can only hit once; clear the timestamp to enforce.
    owner.lastSpitAt = 0;

    target.hp -= 1;
    owner.point++;
    if (target.hp <= 0) {
      target.isDead = true;
      this.eliminations = (this.eliminations || 0) + 1;
      this.namespace.to(targetId).emit('game_over', { reason: 'eliminated' });
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    if (!this.isPlaying) return;

    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead);
    // Last-alpaca-standing only counts if a real elimination happened — stops
    // a leaver from handing the survivor a free win.
    if (
      this.playersJoined > 1 &&
      alivePlayers.length <= 1 &&
      (this.eliminations || 0) > 0
    ) {
      this.status = 'GAME_OVER';
      const winnerSocketId = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      this.endMatch(winnerSocketId, 'lastone_standing');
      return;
    }
    // Solo match: when the lone player dies, end the match so the heartbeat
    // doesn't leak. No winner, no persistence.
    if (this.playersJoined === 1 && alivePlayers.length === 0) {
      this.status = 'GAME_OVER';
      this.endMatch(null, 'no_survivors');
    }
  }

  endMatch(winnerSocketId, reason) {
    this.update()
    this.isPlaying = false;
    this.broadcast('game_over', { reason, winnerId: winnerSocketId });
    this._persistOutcome(winnerSocketId).catch((err) =>
      error('[spit-royale] failed to persist outcome:', err.message),
    );
    this.stop();
  }

  async _persistOutcome(winnerSocketId) {
    if (this.finalized) return;
    this.finalized = true;

    const ranked = Array.from(this.players.values()).filter((p) =>
      Number.isFinite(p.userId),
    );
    if (ranked.length < MIN_RANKED_PLAYERS) return;

    const winnerPlayer = winnerSocketId
      ? ranked.find((p) => p.id === winnerSocketId)
      : null;

    await Promise.all(
      ranked.map(async (p) => {
        const isWinner = winnerPlayer != null && p.userId === winnerPlayer.userId;
        const result = isWinner ? 'win' : 'loss';

        await Game.updateStats(p.userId, GAME_TYPE, result);
        // Server-validated kills for the kills leaderboard. p.point is the
        // kill counter incremented in handleSpitHit (only after a successful
        // server-side range/cooldown check), so this is cheat-resistant.
        if (p.point > 0) {
          await Game.incrementCounter(p.userId, GAME_TYPE, 'kills', p.point);
        }

        if (isWinner) {
          await GamificationService.onWin(p.userId, GAME_TYPE);
        } else {
          await GamificationService.onLoss(p.userId);
        }
      }),
    );

    // Persist a Game row for 2-player matches so /api/game/history shows
    // online matches. The Game schema is player1/player2 only — >2 player
    // matches are reflected in GameStat (wins/losses/level) but not in the
    // per-match history. Schema extension (match_participant table) is
    // tracked separately.
    if (ranked.length === 2) {
      try {
        const [a, b] = ranked;
        const game = await Game.create({ player1Id: a.userId, gameType: GAME_TYPE });
        await Game.joinGame(game.id, b.userId);
        await Game.finishGame(game.id, {
          winnerId: winnerPlayer?.userId ?? null,
          player1Score: a.point ?? 0,
          player2Score: b.point ?? 0,
        });
      } catch (err) {
        error('[spit-royale] game-row persist failed:', err.message);
      }
    }
  }

  update() {
    if (!this.isPlaying) return;

    const playersArr = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      point: p.point,
      isDead: p.isDead,
      color: p.color,
      x: p.x,
      y: p.y,
      z: p.z,
      angle: p.angle
    }));

    this.broadcast('tick', { players: playersArr });
  }
}
