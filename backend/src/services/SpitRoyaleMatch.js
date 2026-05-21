import { BaseMatch } from "./BaseMatch.js";

const ARENA_RADIUS = 25;
const PLAYER_RADIUS = 2;

export class SpitRoyalMatch extends BaseMatch {
  constructor(id, namespace, roomName, onStateChange) {
    super(id, namespace, roomName, onStateChange);
    this.tickRate = 33;
    this.isPlaying = false;
    this.playersJoined = 0;
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
    player.isDead = false;
    player.point = 0;

    this.playersJoined++;

    this.syncLobby();

    if (this.status === 'LOBBY') {
      this.status = 'PLAYING';
      this.isPlaying = true;
      //if (this.onStateChange) this.onStateChange();
    }

    socket.emit('game_start', { instant: true, spawn });
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.isDead = true;
    }
    super.removePlayer(socketId);
    this.checkWinCondition();
  }

  handlePlayerInput(socketId, { x, y, z, angle }) {
    const player = this.players.get(socketId);
    if (player && !player.isDead) {
      if (x !== undefined) player.x = x;
      if (y !== undefined) player.y = y;
      if (z !== undefined) player.z = z;
      if (angle !== undefined) player.angle = angle;
    }
  }

  handlePlayerSpit(socketId, direction) {
    const player = this.players.get(socketId);
    if (player && !player.isDead) {
      this.broadcast('player_spit', { ownerId: socketId, direction: direction });
    }
  }

  handleSpitHit(ownerId, targetId) {
    const target = this.players.get(targetId);
    const owner = this.players.get(ownerId);

    if (target && !target.isDead) {
      target.hp -= 1;
      if (owner) owner.point++;

      if (target.hp <= 0) {
        target.isDead = true;

        this.namespace.to(targetId).emit('game_over', { reason: 'eliminated' });
        this.checkWinCondition();
      }
    }
  }

  checkWinCondition() {
    if (!this.isPlaying) return;

    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead);
    // Require at least 2 players to have joined before triggering a "last alpaca standing" win
    if (this.playersJoined > 1 && alivePlayers.length <= 1) {
      this.status === 'GAME_OVER'
      const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      this.endMatch(winnerId, 'lastone_standing');
    }
  }

  endMatch(winnerPlayerId, reason) {
    this.isPlaying = false;

    this.broadcast('game_over', {
      reason,
      winnerId: winnerPlayerId,
    });
    this.stop();
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