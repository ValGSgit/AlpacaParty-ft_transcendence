import AuthService from './authService.js';
import User from '../models/User.js';

const TICK_RATE = 20;
const ARENA_RADIUS = 18;
const SPIT_SPEED = 14;
const SPIT_DAMAGE = 20;
const SPIT_RADIUS = 0.35;
const PLAYER_RADIUS = 0.8;
const POWERUP_TYPES = ['speed', 'shield', 'bigSpit', 'heal'];
const MAX_HEALTH = 100;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createRoom(id) {
  return {
    id,
    socketRoom: `spit-room:${id}`,
    players: {},
    spits: {},
    powerups: {},
    state: 'lobby',
    winner: null,
    startTimer: null,
    tickInterval: null,
    powerupInterval: null,
  };
}

function buildState(room) {
  return {
    state: room.state,
    winner: room.winner,
    players: Object.values(room.players).map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      z: p.z,
      angle: p.angle,
      health: p.health,
      alive: p.alive,
      color: p.color,
      shieldTimer: p.shieldTimer,
    })),
    spits: Object.values(room.spits),
    powerups: Object.values(room.powerups),
  };
}

function spawnPowerup(room) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * (ARENA_RADIUS - 3) + 1;
  const id = generateId();
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  room.powerups[id] = {
    id,
    type,
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
  };
}

export function initializeSpitRoyaleNamespace(io) {
  const namespace = io.of('/spit-royale');
  const queuedPlayers = new Map();
  const matches = new Map();
  const playerToMatch = new Map();
  let waitingPlayerId = null;

  function broadcast(match, msg) {
    namespace.to(match.socketRoom).emit('spit:message', msg);
  }

  function cleanupMatch(matchId) {
    const match = matches.get(matchId);
    if (!match) return;
    if (match.tickInterval) clearInterval(match.tickInterval);
    if (match.powerupInterval) clearInterval(match.powerupInterval);
    if (match.startTimer) clearTimeout(match.startTimer);
    for (const pid of Object.keys(match.players)) {
      playerToMatch.delete(pid);
    }
    matches.delete(matchId);
  }

  function applyPowerup(match, player, type) {
    if (type === 'speed') {
      player.speed = 12;
      player.speedTimer = 5;
    } else if (type === 'shield') {
      player.shieldTimer = 4;
    } else if (type === 'bigSpit') {
      player.bigSpitTimer = 8;
    } else if (type === 'heal') {
      player.health = Math.min(MAX_HEALTH, player.health + 40);
    }
    broadcast(match, { type: 'powerup_collected', playerId: player.id, powerupType: type });
  }

  function startMatch(match) {
    match.state = 'playing';
    match.winner = null;

    const colors = [0xf4a261, 0x2a9d8f];
    const spawns = [
      { x: -8, z: 0, angle: Math.PI / 2 },
      { x: 8, z: 0, angle: -Math.PI / 2 },
    ];

    const pids = Object.keys(match.players);
    for (let i = 0; i < pids.length; i += 1) {
      const pid = pids[i];
      const player = match.players[pid];
      const pos = spawns[i];
      player.x = pos.x;
      player.z = pos.z;
      player.angle = pos.angle;
      player.health = MAX_HEALTH;
      player.alive = true;
      player.speed = 6;
      player.spitCooldown = 0;
      player.shieldTimer = 0;
      player.bigSpitTimer = 0;
      player.speedTimer = 0;
      player.color = colors[i % colors.length];
    }

    match.spits = {};
    match.powerups = {};
    for (let i = 0; i < 4; i += 1) spawnPowerup(match);

    broadcast(match, { type: 'game_start', state: buildState(match) });
  }

  function checkWinCondition(match) {
    const alive = Object.values(match.players).filter((p) => p.alive);
    if (alive.length <= 1) {
      match.state = 'ended';
      match.winner = alive.length === 1 ? alive[0].name : 'No one';
      broadcast(match, { type: 'game_over', winner: match.winner, state: buildState(match) });
      setTimeout(() => cleanupMatch(match.id), 3000);
    }
  }

  function tickMatch(match) {
    if (match.state !== 'playing') return;
    const dt = TICK_RATE / 1000;

    for (const [sid, spit] of Object.entries(match.spits)) {
      spit.x += spit.vx * dt;
      spit.z += spit.vz * dt;
      spit.life -= dt;

      if (Math.sqrt(spit.x * spit.x + spit.z * spit.z) > ARENA_RADIUS || spit.life <= 0) {
        delete match.spits[sid];
        continue;
      }

      let hit = false;
      for (const player of Object.values(match.players)) {
        if (!player.alive || player.id === spit.ownerId) continue;
        const dx = player.x - spit.x;
        const dz = player.z - spit.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const spitR = spit.big ? SPIT_RADIUS * 2 : SPIT_RADIUS;
        if (dist < PLAYER_RADIUS + spitR) {
          if (player.shieldTimer > 0) {
            broadcast(match, { type: 'shield_block', playerId: player.id });
          } else {
            const dmg = spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE;
            player.health = Math.max(0, player.health - dmg);
            broadcast(match, {
              type: 'player_hit',
              targetId: player.id,
              ownerId: spit.ownerId,
              damage: dmg,
              x: spit.x,
              z: spit.z,
            });
            if (player.health <= 0) {
              player.alive = false;
              broadcast(match, { type: 'player_eliminated', id: player.id, killerId: spit.ownerId });
              checkWinCondition(match);
            }
          }
          delete match.spits[sid];
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    for (const player of Object.values(match.players)) {
      if (!player.alive) continue;
      if (player.spitCooldown > 0) player.spitCooldown -= dt;
      if (player.shieldTimer > 0) player.shieldTimer -= dt;
      if (player.bigSpitTimer > 0) player.bigSpitTimer -= dt;
      if (player.speedTimer > 0) {
        player.speedTimer -= dt;
        if (player.speedTimer <= 0) player.speed = 6;
      }

      for (const [puid, pu] of Object.entries(match.powerups)) {
        const dx = player.x - pu.x;
        const dz = player.z - pu.z;
        if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
          delete match.powerups[puid];
          applyPowerup(match, player, pu.type);
          spawnPowerup(match);
        }
      }
    }

    broadcast(match, { type: 'tick', state: buildState(match) });
  }

  function pairPlayers(playerA, playerB) {
    const matchId = generateId();
    const match = createRoom(matchId);
    match.socketRoom = `spit-match:${matchId}`;
    match.players = {
      [playerA.id]: playerA,
      [playerB.id]: playerB,
    };

    matches.set(matchId, match);
    playerToMatch.set(playerA.id, matchId);
    playerToMatch.set(playerB.id, matchId);

    playerA.socket.join(match.socketRoom);
    playerB.socket.join(match.socketRoom);

    playerA.socket.emit('spit:message', {
      type: 'joined',
      playerId: playerA.id,
      roomId: matchId,
      state: buildState(match),
    });
    playerB.socket.emit('spit:message', {
      type: 'joined',
      playerId: playerB.id,
      roomId: matchId,
      state: buildState(match),
    });

    broadcast(match, { type: 'countdown', seconds: 3 });

    match.startTimer = setTimeout(() => startMatch(match), 3000);
    match.tickInterval = setInterval(() => tickMatch(match), TICK_RATE);
    match.powerupInterval = setInterval(() => {
      if (match.state === 'playing' && Object.keys(match.powerups).length < 5) {
        spawnPowerup(match);
      }
    }, 8000);
  }

  function unqueuePlayer(playerId) {
    if (waitingPlayerId === playerId) waitingPlayerId = null;
    queuedPlayers.delete(playerId);
  }

  function onPlayerLeave(playerId) {
    unqueuePlayer(playerId);
    const matchId = playerToMatch.get(playerId);
    if (!matchId) return;
    const match = matches.get(matchId);
    if (!match) {
      playerToMatch.delete(playerId);
      return;
    }

    delete match.players[playerId];
    playerToMatch.delete(playerId);

    const remaining = Object.values(match.players);
    if (remaining.length === 1) {
      const winner = remaining[0];
      match.state = 'ended';
      match.winner = winner.name;
      broadcast(match, {
        type: 'game_over',
        winner: winner.name,
        reason: 'disconnect',
        state: buildState(match),
      });
    }

    setTimeout(() => cleanupMatch(matchId), 1000);
  }

  namespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = AuthService.verifyToken(token);
      if (!decoded || decoded.type === 'refresh') return next(new Error('Invalid token'));

      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(err);
    }
  });

  namespace.on('connection', (socket) => {
    const playerId = generateId();
    socket.data.spitPlayerId = playerId;

    socket.on('join', ({ name } = {}) => {
      const displayName = (name && String(name).trim()) || socket.user?.username || `Alpaca_${playerId.slice(0, 4)}`;

      const player = {
        id: playerId,
        name: displayName.slice(0, 20),
        socket,
        userId: socket.user.id,
        x: 0,
        z: 0,
        angle: 0,
        health: MAX_HEALTH,
        alive: true,
        speed: 6,
        spitCooldown: 0,
        shieldTimer: 0,
        bigSpitTimer: 0,
        speedTimer: 0,
        color: 0xf4a261,
      };

      queuedPlayers.set(playerId, player);

      if (waitingPlayerId && waitingPlayerId !== playerId && queuedPlayers.has(waitingPlayerId)) {
        const waiting = queuedPlayers.get(waitingPlayerId);
        waitingPlayerId = null;
        queuedPlayers.delete(playerId);
        queuedPlayers.delete(waiting.id);
        pairPlayers(waiting, player);
      } else {
        waitingPlayerId = playerId;
        socket.emit('spit:message', { type: 'queue_waiting' });
      }
    });

    socket.on('input', ({ vx = 0, vz = 0, angle } = {}) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;
      const player = match.players[playerId];
      if (!player || !player.alive || match.state !== 'playing') return;

      const dt = TICK_RATE / 1000;
      let nx = player.x + vx * player.speed * dt;
      let nz = player.z + vz * player.speed * dt;
      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > ARENA_RADIUS - PLAYER_RADIUS) {
        const scale = (ARENA_RADIUS - PLAYER_RADIUS) / dist;
        nx *= scale;
        nz *= scale;
      }

      player.x = nx;
      player.z = nz;
      if (angle !== undefined) player.angle = angle;
    });

    socket.on('spit', ({ angle } = {}) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;
      const player = match.players[playerId];
      if (!player || !player.alive || match.state !== 'playing') return;
      if (player.spitCooldown > 0) return;

      const big = player.bigSpitTimer > 0;
      player.spitCooldown = big ? 0.4 : 0.6;

      const sid = generateId();
      const shootAngle = angle ?? player.angle;
      match.spits[sid] = {
        id: sid,
        ownerId: playerId,
        x: player.x + Math.sin(shootAngle) * 1.2,
        z: player.z + Math.cos(shootAngle) * 1.2,
        vx: Math.sin(shootAngle) * SPIT_SPEED,
        vz: Math.cos(shootAngle) * SPIT_SPEED,
        life: 2.5,
        big,
      };
    });

    socket.on('disconnect', () => {
      onPlayerLeave(playerId);
    });
  });
}

export default initializeSpitRoyaleNamespace;