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
  const rooms = {};
  const playerRoom = {};

  function broadcast(room, msg) {
    namespace.to(room.socketRoom).emit('spit:message', msg);
  }

  function applyPowerup(room, player, type) {
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
    broadcast(room, { type: 'powerup_collected', playerId: player.id, powerupType: type });
  }

  function startGame(room) {
    room.state = 'playing';
    room.winner = null;

    const colors = [0xf4a261, 0x2a9d8f, 0xe9c46a, 0xe76f51, 0x6a4c93, 0x4cc9f0];
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const spawns = [
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 10, z: 10 },
    ];

    let i = 0;
    for (const pid of Object.keys(room.players)) {
      const player = room.players[pid];
      const pos = spawns[i % spawns.length];
      player.x = pos.x;
      player.z = pos.z;
      player.angle = Math.atan2(-pos.x, -pos.z);
      player.health = MAX_HEALTH;
      player.alive = true;
      player.speed = 6;
      player.spitCooldown = 0;
      player.shieldTimer = 0;
      player.bigSpitTimer = 0;
      player.speedTimer = 0;
      player.color = shuffled[i % shuffled.length];
      i += 1;
    }

    room.spits = {};
    room.powerups = {};
    for (let k = 0; k < 4; k += 1) spawnPowerup(room);

    broadcast(room, { type: 'game_start', state: buildState(room) });
  }

  function checkWinCondition(room) {
    const alive = Object.values(room.players).filter((p) => p.alive);
    if (alive.length <= 1 && Object.keys(room.players).length > 1) {
      room.state = 'ended';
      room.winner = alive.length === 1 ? alive[0].name : 'No one';
      broadcast(room, { type: 'game_over', winner: room.winner, state: buildState(room) });
      setTimeout(() => {
        if (!rooms[room.id]) return;
        if (Object.keys(room.players).length >= 1) startGame(room);
      }, 5000);
    }
  }

  function tickRoom(room) {
    if (room.state !== 'playing') return;
    const dt = TICK_RATE / 1000;

    for (const [sid, spit] of Object.entries(room.spits)) {
      spit.x += spit.vx * dt;
      spit.z += spit.vz * dt;
      spit.life -= dt;

      if (Math.sqrt(spit.x * spit.x + spit.z * spit.z) > ARENA_RADIUS || spit.life <= 0) {
        delete room.spits[sid];
        continue;
      }

      let hit = false;
      for (const player of Object.values(room.players)) {
        if (!player.alive || player.id === spit.ownerId) continue;
        const dx = player.x - spit.x;
        const dz = player.z - spit.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const spitR = spit.big ? SPIT_RADIUS * 2 : SPIT_RADIUS;
        if (dist < PLAYER_RADIUS + spitR) {
          if (player.shieldTimer > 0) {
            broadcast(room, { type: 'shield_block', playerId: player.id });
          } else {
            const dmg = spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE;
            player.health = Math.max(0, player.health - dmg);
            broadcast(room, {
              type: 'player_hit',
              targetId: player.id,
              ownerId: spit.ownerId,
              damage: dmg,
              x: spit.x,
              z: spit.z,
            });
            if (player.health <= 0) {
              player.alive = false;
              broadcast(room, { type: 'player_eliminated', id: player.id, killerId: spit.ownerId });
              checkWinCondition(room);
            }
          }
          delete room.spits[sid];
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    for (const player of Object.values(room.players)) {
      if (!player.alive) continue;
      if (player.spitCooldown > 0) player.spitCooldown -= dt;
      if (player.shieldTimer > 0) player.shieldTimer -= dt;
      if (player.bigSpitTimer > 0) player.bigSpitTimer -= dt;
      if (player.speedTimer > 0) {
        player.speedTimer -= dt;
        if (player.speedTimer <= 0) player.speed = 6;
      }

      for (const [puid, pu] of Object.entries(room.powerups)) {
        const dx = player.x - pu.x;
        const dz = player.z - pu.z;
        if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
          delete room.powerups[puid];
          applyPowerup(room, player, pu.type);
          spawnPowerup(room);
        }
      }
    }

    broadcast(room, { type: 'tick', state: buildState(room) });
  }

  function findOrCreateRoom() {
    for (const room of Object.values(rooms)) {
      if (room.state === 'lobby' && Object.keys(room.players).length < 4) return room;
    }
    const id = generateId();
    const room = createRoom(id);
    room.tickInterval = setInterval(() => tickRoom(room), TICK_RATE);
    room.powerupInterval = setInterval(() => {
      if (room.state === 'playing' && Object.keys(room.powerups).length < 5) {
        spawnPowerup(room);
      }
    }, 8000);
    rooms[id] = room;
    return room;
  }

  function removePlayerFromRoom(playerId, socket) {
    const roomId = playerRoom[playerId];
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    delete room.players[playerId];
    delete playerRoom[playerId];
    socket.leave(room.socketRoom);

    if (Object.keys(room.players).length === 0) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      if (room.powerupInterval) clearInterval(room.powerupInterval);
      if (room.startTimer) clearTimeout(room.startTimer);
      delete rooms[roomId];
      return;
    }

    broadcast(room, {
      type: 'player_left',
      id: playerId,
      state: buildState(room),
    });

    if (room.state === 'playing') checkWinCondition(room);
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
      const room = findOrCreateRoom();
      const displayName = (name && String(name).trim()) || socket.user?.username || `Alpaca_${playerId.slice(0, 4)}`;

      room.players[playerId] = {
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
      playerRoom[playerId] = room.id;
      socket.join(room.socketRoom);

      socket.emit('spit:message', {
        type: 'joined',
        playerId,
        roomId: room.id,
        state: buildState(room),
      });

      broadcast(room, {
        type: 'player_joined',
        id: playerId,
        name: room.players[playerId].name,
        state: buildState(room),
      });

      const playerCount = Object.keys(room.players).length;
      if (playerCount >= 2 && room.state === 'lobby') {
        if (room.startTimer) clearTimeout(room.startTimer);
        room.startTimer = setTimeout(() => {
          if (room.state === 'lobby') startGame(room);
        }, 3000);
        broadcast(room, { type: 'countdown', seconds: 3 });
      } else if (playerCount === 1) {
        if (room.startTimer) clearTimeout(room.startTimer);
        room.startTimer = setTimeout(() => {
          if (room.state === 'lobby' && Object.keys(room.players).length >= 1) startGame(room);
        }, 10000);
        broadcast(room, { type: 'countdown', seconds: 10 });
      }
    });

    socket.on('input', ({ vx = 0, vz = 0, angle } = {}) => {
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;

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
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;
      if (player.spitCooldown > 0) return;

      const big = player.bigSpitTimer > 0;
      player.spitCooldown = big ? 0.4 : 0.6;

      const sid = generateId();
      const shootAngle = angle ?? player.angle;
      room.spits[sid] = {
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
      removePlayerFromRoom(playerId, socket);
    });
  });
}

export default initializeSpitRoyaleNamespace;