import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;
const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

const TICK_RATE = 20; // ms per tick (50Hz)
const ARENA_RADIUS = 18;
const SPIT_SPEED = 14;
const SPIT_DAMAGE = 20;
const SPIT_RADIUS = 0.35;
const PLAYER_RADIUS = 0.8;
const POWERUP_TYPES = ['speed', 'shield', 'bigSpit', 'heal'];
const MAX_HEALTH = 100;

let rooms = {};
let playerRoom = {};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createRoom(id) {
  return {
    id,
    players: {},
    spits: {},
    powerups: {},
    state: 'lobby', // lobby | playing | ended
    winner: null,
    startTimer: null,
  };
}

function spawnPowerup(room) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * (ARENA_RADIUS - 3) + 1;
  const id = generateId();
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  room.powerups[id] = {
    id, type,
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
  };
}

function startGame(room) {
  room.state = 'playing';
  room.winner = null;

  const colors = [0xf4a261, 0x2a9d8f, 0xe9c46a, 0xe76f51, 0x6a4c93, 0x4cc9f0];
  const shuffled = colors.sort(() => Math.random() - 0.5);

  let i = 0;
  const SPAWN_POSITIONS = [
    { x: -10, z: -10 }, { x: 10, z: -10 },
    { x: -10, z: 10 }, { x: 10, z: 10 },
  ];

  for (const pid of Object.keys(room.players)) {
    const pos = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length];
    const player = room.players[pid];
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
    i++;
  }

  room.spits = {};
  room.powerups = {};
  for (let s = 0; s < 4; s++) spawnPowerup(room);

  broadcast(room, { type: 'game_start', state: buildState(room) });
}

function buildState(room) {
  return {
    state: room.state,
    winner: room.winner,
    players: Object.values(room.players).map(p => ({
      id: p.id, name: p.name, x: p.x, z: p.z,
      angle: p.angle, health: p.health, alive: p.alive,
      color: p.color, shieldTimer: p.shieldTimer,
    })),
    spits: Object.values(room.spits),
    powerups: Object.values(room.powerups),
  };
}

function broadcast(room, msg) {
  const str = JSON.stringify(msg);
  for (const pid of Object.keys(room.players)) {
    const p = room.players[pid];
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(str);
    }
  }
}

function removePlayerFromRoom(playerId) {
  const roomId = playerRoom[playerId];
  if (!roomId || !rooms[roomId]) return;
  const room = rooms[roomId];
  delete room.players[playerId];
  delete playerRoom[playerId];

  if (Object.keys(room.players).length === 0) {
    if (room.tickInterval) clearInterval(room.tickInterval);
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

function checkWinCondition(room) {
  const alive = Object.values(room.players).filter(p => p.alive);
  if (alive.length <= 1 && Object.keys(room.players).length > 1) {
    room.state = 'ended';
    room.winner = alive.length === 1 ? alive[0].name : 'No one';
    broadcast(room, { type: 'game_over', winner: room.winner, state: buildState(room) });

    // Restart after 5 seconds
    setTimeout(() => {
      if (!rooms[room.id]) return;
      if (Object.keys(room.players).length >= 1) startGame(room);
    }, 5000);
  }
}

// Game tick
function tickRoom(room) {
  if (room.state !== 'playing') return;
  const dt = TICK_RATE / 1000;

  // Update spits
  for (const [sid, spit] of Object.entries(room.spits)) {
    spit.x += spit.vx * dt;
    spit.z += spit.vz * dt;
    spit.life -= dt;

    // Out of bounds check
    if (Math.sqrt(spit.x * spit.x + spit.z * spit.z) > ARENA_RADIUS || spit.life <= 0) {
      delete room.spits[sid];
      continue;
    }

    // Collision with players
    let hit = false;
    for (const player of Object.values(room.players)) {
      if (!player.alive) continue;
      if (player.id === spit.ownerId) continue;
      const dx = player.x - spit.x;
      const dz = player.z - spit.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const spitR = spit.big ? SPIT_RADIUS * 2 : SPIT_RADIUS;
      if (dist < PLAYER_RADIUS + spitR) {
        if (player.shieldTimer > 0) {
          // Shield absorbs hit
          broadcast(room, { type: 'shield_block', playerId: player.id });
        } else {
          const dmg = spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE;
          player.health = Math.max(0, player.health - dmg);
          broadcast(room, {
            type: 'player_hit',
            targetId: player.id,
            ownerId: spit.ownerId,
            damage: dmg,
            x: spit.x, z: spit.z,
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

  // Update cooldowns & timers
  for (const player of Object.values(room.players)) {
    if (!player.alive) continue;
    if (player.spitCooldown > 0) player.spitCooldown -= dt;
    if (player.shieldTimer > 0) player.shieldTimer -= dt;
    if (player.bigSpitTimer > 0) player.bigSpitTimer -= dt;
    if (player.speedTimer > 0) {
      player.speedTimer -= dt;
      if (player.speedTimer <= 0) player.speed = 6;
    }

    // Powerup collection
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

// Find or create a room with available space
function findOrCreateRoom() {
  for (const room of Object.values(rooms)) {
    if (room.state === 'lobby' && Object.keys(room.players).length < 4) return room;
  }
  const id = generateId();
  const room = createRoom(id);
  rooms[id] = room;

  room.tickInterval = setInterval(() => tickRoom(room), TICK_RATE);

  // Powerup respawn timer
  setInterval(() => {
    if (room.state === 'playing' && Object.keys(room.powerups).length < 5) {
      spawnPowerup(room);
    }
  }, 8000);

  return room;
}

wss.on('connection', (ws) => {
  const playerId = generateId();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const room = findOrCreateRoom();
      room.players[playerId] = {
        id: playerId,
        name: msg.name || `Alpaca_${playerId.slice(0, 4)}`,
        ws,
        x: 0, z: 0, angle: 0,
        health: MAX_HEALTH,
        alive: true,
        speed: 6,
        spitCooldown: 0,
        shieldTimer: 0,
        bigSpitTimer: 0,
        speedTimer: 0,
        color: 0xf4a261,
        // Input state
        vx: 0, vz: 0,
      };
      playerRoom[playerId] = room.id;

      ws.send(JSON.stringify({
        type: 'joined',
        playerId,
        roomId: room.id,
        state: buildState(room),
      }));

      broadcast(room, {
        type: 'player_joined',
        id: playerId,
        name: room.players[playerId].name,
        state: buildState(room),
      });

      // Auto-start when 2+ players or solo after 10s
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
    }

    if (msg.type === 'input') {
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;

      // Apply movement
      const speed = player.speed;
      const dt = TICK_RATE / 1000;
      let nx = player.x + (msg.vx || 0) * speed * dt;
      let nz = player.z + (msg.vz || 0) * speed * dt;

      // Clamp to arena
      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > ARENA_RADIUS - PLAYER_RADIUS) {
        const sc = (ARENA_RADIUS - PLAYER_RADIUS) / dist;
        nx *= sc; nz *= sc;
      }

      player.x = nx;
      player.z = nz;
      if (msg.angle !== undefined) player.angle = msg.angle;
    }

    if (msg.type === 'spit') {
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;
      if (player.spitCooldown > 0) return;

      const big = player.bigSpitTimer > 0;
      player.spitCooldown = big ? 0.4 : 0.6;

      const sid = generateId();
      const angle = msg.angle ?? player.angle;
      room.spits[sid] = {
        id: sid,
        ownerId: playerId,
        x: player.x + Math.sin(angle) * 1.2,
        z: player.z + Math.cos(angle) * 1.2,
        vx: Math.sin(angle) * SPIT_SPEED,
        vz: Math.cos(angle) * SPIT_SPEED,
        life: 2.5,
        big,
      };
    }
  });

  ws.on('close', () => removePlayerFromRoom(playerId));
  ws.on('error', () => removePlayerFromRoom(playerId));
});

server.listen(PORT, () => console.log(`🦙 Alpaca Spit Royale server on ws://localhost:${PORT}/ws`));
