// import { BaseMatch } from "./BaseMatch.js";

// export class SpitRoyalMatch extends BaseMatch {
//   constructor(id, namespace, roomName, onStateChange) {
//     super(id, namespace, roomName, onStateChange);
//     this.spits = [];
//     this.tickRate = 33;
//     this.isPlaying = false;
//     this.heartbeat = setInterval(() => this.update(), this.tickRate);
//   }

//   addPlayer(socket, name, color) {
//     super.addPlayer(socket, name, color);
//     const player = this.players.get(socket.id);
//     player.isActive = true;
//     player.lastActive = Date.now();
//     player.hp = 3;
//     player.isDead = false;
//     player.isHit = false;
//     this.syncLobby();

//     if (this.status === 'LOBBY') {
//       this.start();
//     } else if (this.status === 'PLAYING') {
//       socket.emit('game_start', { instant: true });
//     }
//   }

//   start() {
//     this.status = 'PLAYING';
//     this.isPlaying = true;
//     this.broadcast('game_start', { instant: true });
//   }

//   stop() {
//     super.stop();
//     this.isPlaying = false;
//     this.spits = [];
//   }

//   handlePlayerHit(socketId) {
//     const player = this.players.get(socketId);
//     if (player && player.hp > 0 && !player.isDead && !player.isHit) {
//       player.isHit = true;
//       player.hp--;
//       if (player.hp <= 0) {
//         player.isDead = true;
//       }
//       this.syncLobby();
//     }
//   }

//   handlePlayerSpit(socketId, targetDirection) {
//     const player = this.players.get(socketId);
//     if (player && !player.isDead) {
//       this.spits.push({
//         id: Math.random().toString(36),
//         ownerId: socketId,
//         x: player.x,
//         z: player.z,
//         direction: targetDirection
//       });
//     }
//   }

//   update() {
//     if (!this.isPlaying) return;

//     const tick = this.tickRate / 1000;

//     const playersArr = Array.from(this.players.values()).map(p => ({
//       id: p.id,
//       name: p.name,
//       hp: p.hp,
//       point: p.points,
//       isDead: p.isDead,
//       color: p.color,
//       x: p.x,
//       z: p.z
//     }));

//     this.broadcast('tick', {
//       players: playersArr,
//       spits: this.spits,
//     });
//   }
// }

import Game from '../models/Game.js'; // Ensure this path matches your DB model
import { BaseMatch } from "./BaseMatch.js";

const ARENA_RADIUS = 25;
const PLAYER_RADIUS = 2;
const ELO_K = 24;
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
    this.finalized = false;
    this.participants = []; 
    
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
    player.userId = socket.user?.id || null; 

    this.participants.push({
      playerId: socket.id,
      userId: player.userId,
      name: player.name
    });

    this.syncLobby();

    if (this.status === 'LOBBY') {
      this.start();
      if (this.onStateChange) this.onStateChange();
    } else if (this.status === 'PLAYING') {
      socket.emit('game_start', { instant: true, spawn });
    }
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.alive = false; 
    }
    super.removePlayer(socketId);
    this.checkWinCondition();
  }

  start() {
    this.status = 'PLAYING';
    this.isPlaying = true;
    this.broadcast('game_start', { instant: true });
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
      
      if (target.hp <= 0) {
        target.alive = false;
        target.isDead = true; 
        if (owner) owner.point++;
        
        this.namespace.to(targetId).emit('game_over', { reason: 'eliminated' });
        
        this.checkWinCondition();
      }
    }
  }

  checkWinCondition() {
    if (!this.isPlaying) return;
    
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
    
    if (this.participants.length >= MIN_RANKED_PLAYERS && alivePlayers.length <= 1) {
      const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      this.endMatch(winnerId, 'last_alpaca_standing');
    }
  }

  async endMatch(winnerPlayerId, reason) {
    if (this.finalized) return;
    this.finalized = true;
    this.isPlaying = false;
    
    const winner = winnerPlayerId ? this.players.get(winnerPlayerId) : null;
    
    this.broadcast('match_over', {
      reason,
      winnerId: winnerPlayerId,
      winnerName: winner?.name || null
    });

    try {
      const validParticipants = this.participants.filter(p => Number.isFinite(p.userId));
      if (validParticipants.length >= MIN_RANKED_PLAYERS) {
        
        const currentStats = await Promise.all(
          validParticipants.map(p => Game.getStats(p.userId, 'spit_royale'))
        );
        
        const eloByUser = new Map();
        validParticipants.forEach((p, i) => eloByUser.set(p.userId, currentStats[i]?.elo ?? 1000));
        const totalElo = Array.from(eloByUser.values()).reduce((a, b) => a + b, 0);

        await Promise.all(validParticipants.map(async (p) => {
          const myElo = eloByUser.get(p.userId);
          const avgOpp = validParticipants.length > 1 ? (totalElo - myElo) / (validParticipants.length - 1) : myElo;
          const isWinner = p.playerId === winnerPlayerId;
          const result = isWinner ? 'win' : 'loss';
          const newElo = calcElo(myElo, avgOpp, result);
          
          await Game.updateStats(p.userId, 'spit_royale', result);
          await Game.updateElo(p.userId, 'spit_royale', newElo);
        }));
      }
    } catch (err) {
      console.error('[SpitRoyaleMatch] Failed to persist ELO:', err.message);
    }

    setTimeout(() => this.stop(), 5000);
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