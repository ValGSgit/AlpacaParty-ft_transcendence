import { debug, error } from "#lib/logger.js";
import { BaseMatch } from "./BaseMatch.js";
import Game from "../models/Game.js";
import GamificationService from "./GamificationService.js";

const ARENA_RADIUS = 25;
const PLAYER_RADIUS = 2;
const ELO_K = 32;
const GAME_TYPE = 'spit_royale';
const MIN_RANKED_PLAYERS = 2;

function calcElo(playerElo, avgOpponentElo, result) {
  const expected = 1 / (1 + Math.pow(10, (avgOpponentElo - playerElo) / 400));
  const score = result === 'win' ? 1 : 0;
  return Math.round(playerElo + ELO_K * (score - expected));
}

export class SpitRoyalMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange);
    this.tickRate = 33;
    this.isPlaying = false;
    this.playersJoined = 0;
    this.finalized = false;
    this.heartbeat = setInterval(() => this.update(), this.tickRate);
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

  addPlayer(socket, name, color) {
    super.addPlayer(socket, name, color);
    const player = this.players.get(socket.id);

    const spawn = this.getValidSpawn();
    player.x = spawn.x;
    player.y = 0;
    player.z = spawn.z;
    player.angle = spawn.angle;
    player.hp = 3;
    player.alive = true;
    player.point = 0;

    this.playersJoined++;

    this.syncLobby();

    if (this.status === 'LOBBY') {
      this.status = 'PLAYING';
      this.isPlaying = true;
    }

    socket.emit('game_start', { instant: true, spawn });
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.alive = false;
    }
    super.removePlayer(socketId);
    this.checkWinCondition();
  }

  handlePlayerInput(socketId, { x, y, z, angle }) {
    const player = this.players.get(socketId);
    if (player && player.alive) {
      if (x !== undefined) player.x = x;
      if (y !== undefined) player.y = y;
      if (z !== undefined) player.z = z;
      if (angle !== undefined) player.angle = angle;
    }
  }

  handlePlayerSpit(socketId, direction) {
    const player = this.players.get(socketId);
    if (player && player.alive) {
      this.broadcast('player_spit', { ownerId: socketId, direction: direction });
    }
  }

  handleSpitHit(ownerId, targetId) {
    const target = this.players.get(targetId);
    const owner = this.players.get(ownerId);

    if (target && target.alive) {
      target.hp -= 1;
      if (owner) owner.point++;

      if (target.hp <= 0) {
        target.alive = false;
        target.isDead = true;

        this.namespace.to(targetId).emit('game_over', { reason: 'eliminated' });
        this.checkWinCondition();
      }
    }
  }

  checkWinCondition() {
    if (!this.isPlaying) return;

    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
    debug("alive:", alivePlayers.length);
    if (this.playersJoined > 1 && alivePlayers.length <= 1) {
      this.status = 'GAME_OVER';
      const winnerSocketId = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      this.endMatch(winnerSocketId, 'lastone_standing');
    }
  }

  endMatch(winnerSocketId, reason) {
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

    const currentStats = await Promise.all(
      ranked.map((p) => Game.getStats(p.userId, GAME_TYPE)),
    );
    const eloByUser = new Map();
    ranked.forEach((p, i) => eloByUser.set(p.userId, currentStats[i].elo ?? 1000));
    const totalElo = Array.from(eloByUser.values()).reduce((a, b) => a + b, 0);

    await Promise.all(
      ranked.map(async (p) => {
        const myElo = eloByUser.get(p.userId);
        const avgOpp = ranked.length > 1 ? (totalElo - myElo) / (ranked.length - 1) : myElo;
        const isWinner = winnerPlayer != null && p.userId === winnerPlayer.userId;
        const result = isWinner ? 'win' : 'loss';
        const newElo = calcElo(myElo, avgOpp, result);

        await Game.updateStats(p.userId, GAME_TYPE, result);
        await Game.updateElo(p.userId, GAME_TYPE, newElo);

        if (isWinner) {
          await GamificationService.onWin(p.userId, GAME_TYPE);
        } else {
          await GamificationService.onLoss(p.userId);
        }
      }),
    );
  }

  update() {
    if (!this.isPlaying) return;

    const playersArr = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      point: p.point,
      isDead: !p.alive,
      color: p.color,
      x: p.x,
      y: p.y,
      z: p.z,
      angle: p.angle
    }));

    this.broadcast('tick', { players: playersArr });
  }
}
