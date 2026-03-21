import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { loadVaultSecrets } from './vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DIST       = path.join(__dirname, '..', 'dist');

const PORT = 3001;
const app  = express();
// Serve the built Vite app under /spit-royale (matches the Vite base path)
app.use('/spit-royale', express.static(DIST));
app.get('/spit-royale*', (_, res) => res.sendFile(path.join(DIST, 'index.html')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ── Constants ────────────────────────────────────────────────────────────────
const TICK_RATE    = 20;       // ms per tick (50 Hz)
const ARENA_RADIUS = 18;
const SPIT_SPEED   = 14;
const SPIT_DAMAGE  = 20;
const SPIT_RADIUS  = 0.35;
const PLAYER_RADIUS = 0.8;
const POWERUP_TYPES = ['speed', 'shield', 'bigSpit', 'heal'];
const MAX_HEALTH   = 100;

// Survival-mode constants
const BOT_COLORS      = [0xc62828, 0x880e4f, 0x1a237e, 0x004d40, 0x33691e];
const BOT_BASE_SPEED  = 4.5;
const GROQ_TICK_MS    = 1500; // how often to call Groq per room

// ── State ────────────────────────────────────────────────────────────────────
let rooms      = {};
let playerRoom = {};

// ── Utility ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Room helpers ─────────────────────────────────────────────────────────────
function createRoom(id) {
  return {
    id,
    players:   {},
    spits:     {},
    powerups:  {},
    state:     'lobby', // lobby | playing | ended
    winner:    null,
    startTimer: null,
    tickInterval: null,
    // Survival extras (populated in createSurvivalRoom)
    isSurvival:  false,
    wave:        0,
    totalKills:  0,
    groqInterval: null,
  };
}

function createSurvivalRoom(id) {
  const room = createRoom(id);
  room.isSurvival = true;
  return room;
}

function spawnPowerup(room) {
  const angle = Math.random() * Math.PI * 2;
  const r     = Math.random() * (ARENA_RADIUS - 3) + 1;
  const id    = generateId();
  const type  = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  room.powerups[id] = { id, type, x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

function buildState(room) {
  return {
    state:   room.state,
    winner:  room.winner,
    players: Object.values(room.players).map(p => ({
      id:          p.id,
      name:        p.name,
      x:           p.x,
      z:           p.z,
      angle:       p.angle,
      health:      p.health,
      alive:       p.alive,
      color:       p.color,
      shieldTimer: p.shieldTimer,
      isBot:       p.isBot ?? false,
    })),
    spits:    Object.values(room.spits),
    powerups: Object.values(room.powerups),
    ...(room.isSurvival ? { wave: room.wave, totalKills: room.totalKills } : {}),
  };
}

function broadcast(room, msg) {
  const str = JSON.stringify(msg);
  for (const p of Object.values(room.players)) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(str);
  }
}

// ── Multiplayer game start ───────────────────────────────────────────────────
function startGame(room) {
  room.state  = 'playing';
  room.winner = null;

  const colors   = [0xf4a261, 0x2a9d8f, 0xe9c46a, 0xe76f51, 0x6a4c93, 0x4cc9f0];
  const shuffled = colors.sort(() => Math.random() - 0.5);

  const SPAWN_POSITIONS = [
    { x: -10, z: -10 }, { x: 10, z: -10 },
    { x: -10, z:  10 }, { x: 10, z:  10 },
  ];

  let i = 0;
  for (const pid of Object.keys(room.players)) {
    const pos    = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length];
    const player = room.players[pid];
    player.x = pos.x; player.z = pos.z;
    player.angle        = Math.atan2(-pos.x, -pos.z);
    player.health       = MAX_HEALTH;
    player.alive        = true;
    player.speed        = 6;
    player.spitCooldown = 0;
    player.shieldTimer  = 0;
    player.bigSpitTimer = 0;
    player.speedTimer   = 0;
    player.color        = shuffled[i % shuffled.length];
    i++;
  }

  room.spits    = {};
  room.powerups = {};
  for (let s = 0; s < 4; s++) spawnPowerup(room);

  broadcast(room, { type: 'game_start', state: buildState(room) });
}

// ── Win / end conditions ─────────────────────────────────────────────────────
function checkWinCondition(room) {
  // ── Survival path ─────────────────────────────────
  if (room.isSurvival) {
    const player = getSurvivalPlayer(room);
    if (!player || !player.alive) {
      // Human player died — game over
      room.state = 'ended';
      broadcast(room, {
        type: 'survival_over',
        wave:  room.wave,
        kills: room.totalKills,
        state: buildState(room),
      });
      // Auto-restart after 5 s
      setTimeout(() => {
        if (!rooms[room.id]) return;
        const p = Object.values(room.players).find(q => !q.isBot);
        if (p) { p.alive = true; startSurvival(room); }
      }, 5000);
    } else {
      // A bot was killed — check wave-clear
      checkWaveClear(room);
    }
    return;
  }

  // ── Multiplayer path ──────────────────────────────
  const alive = Object.values(room.players).filter(p => p.alive);
  if (alive.length <= 1 && Object.keys(room.players).length > 1) {
    room.state  = 'ended';
    room.winner = alive.length === 1 ? alive[0].name : 'No one';
    broadcast(room, { type: 'game_over', winner: room.winner, state: buildState(room) });

    setTimeout(() => {
      if (!rooms[room.id]) return;
      if (Object.keys(room.players).length >= 1) startGame(room);
    }, 5000);
  }
}

function removePlayerFromRoom(playerId) {
  const roomId = playerRoom[playerId];
  if (!roomId || !rooms[roomId]) return;

  const room = rooms[roomId];
  delete room.players[playerId];
  delete playerRoom[playerId];

  // Cleanup if no human players remain (covers both modes)
  const hasHumans = Object.values(room.players).some(p => !p.isBot);
  if (!hasHumans) {
    if (room.tickInterval)  clearInterval(room.tickInterval);
    if (room.groqInterval)  clearInterval(room.groqInterval);
    if (room.startTimer)    clearTimeout(room.startTimer);
    delete rooms[roomId];
    return;
  }

  broadcast(room, { type: 'player_left', id: playerId, state: buildState(room) });
  if (room.state === 'playing') checkWinCondition(room);
}

// ── Powerup application ───────────────────────────────────────────────────────
function applyPowerup(room, player, type) {
  if      (type === 'speed')   { player.speed = 12; player.speedTimer = 5; }
  else if (type === 'shield')  { player.shieldTimer = 4; }
  else if (type === 'bigSpit') { player.bigSpitTimer = 8; }
  else if (type === 'heal')    { player.health = Math.min(MAX_HEALTH, player.health + 40); }
  broadcast(room, { type: 'powerup_collected', playerId: player.id, powerupType: type });
}

// ── Game tick ────────────────────────────────────────────────────────────────
function tickRoom(room) {
  if (room.state !== 'playing') return;
  const dt = TICK_RATE / 1000;

  // Drive bot AI every tick (deterministic movement, Groq provides tactics async)
  if (room.isSurvival) tickBots(room, dt);

  // ── Move & collide spits ──────────────────────────
  for (const [sid, spit] of Object.entries(room.spits)) {
    spit.x    += spit.vx * dt;
    spit.z    += spit.vz * dt;
    spit.life -= dt;

    if (Math.sqrt(spit.x * spit.x + spit.z * spit.z) > ARENA_RADIUS || spit.life <= 0) {
      delete room.spits[sid]; continue;
    }

    let hit = false;
    for (const player of Object.values(room.players)) {
      if (!player.alive) continue;
      if (player.id === spit.ownerId) continue;
      // Bots don't damage each other (prevents wave ending by friendly fire)
      if (room.isSurvival && player.isBot && room.players[spit.ownerId]?.isBot) continue;

      const dx    = player.x - spit.x;
      const dz    = player.z - spit.z;
      const dist  = Math.sqrt(dx * dx + dz * dz);
      const spitR = spit.big ? SPIT_RADIUS * 2 : SPIT_RADIUS;

      if (dist < PLAYER_RADIUS + spitR) {
        if (player.shieldTimer > 0) {
          broadcast(room, { type: 'shield_block', playerId: player.id });
        } else {
          const dmg = spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE;
          player.health = Math.max(0, player.health - dmg);
          broadcast(room, { type: 'player_hit', targetId: player.id, ownerId: spit.ownerId, damage: dmg, x: spit.x, z: spit.z });
          if (player.health <= 0) {
            player.alive = false;
            if (room.isSurvival && player.isBot) room.totalKills++;
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

  // ── Cooldowns, timers, powerup collection ─────────
  for (const player of Object.values(room.players)) {
    if (!player.alive) continue;
    if (player.spitCooldown > 0) player.spitCooldown -= dt;
    if (player.shieldTimer  > 0) player.shieldTimer  -= dt;
    if (player.bigSpitTimer > 0) player.bigSpitTimer -= dt;
    if (player.speedTimer   > 0) {
      player.speedTimer -= dt;
      if (player.speedTimer <= 0) player.speed = 6;
    }

    // Bots don't collect powerups
    if (room.isSurvival && player.isBot) continue;

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

// ── Multiplayer room pool ────────────────────────────────────────────────────
function findOrCreateRoom() {
  for (const room of Object.values(rooms)) {
    if (!room.isSurvival && room.state === 'lobby' && Object.keys(room.players).length < 4) return room;
  }
  const id   = generateId();
  const room = createRoom(id);
  rooms[id]  = room;
  room.tickInterval = setInterval(() => tickRoom(room), TICK_RATE);
  setInterval(() => {
    if (room.state === 'playing' && Object.keys(room.powerups).length < 5) spawnPowerup(room);
  }, 8000);
  return room;
}

// ════════════════════════════════════════════════════════════════════════════
//  SURVIVAL MODE
// ════════════════════════════════════════════════════════════════════════════

function getSurvivalPlayer(room) {
  return Object.values(room.players).find(p => !p.isBot && p.alive);
}

function getSurvivalBots(room) {
  return Object.values(room.players).filter(p => p.isBot && p.alive);
}

/** Reset and start a survival session for the room's human player. */
function startSurvival(room) {
  room.state      = 'playing';
  room.wave       = 0;
  room.totalKills = 0;
  room.spits      = {};
  room.powerups   = {};

  // Reinitialise the human player
  const player = Object.values(room.players).find(p => !p.isBot);
  if (!player) return;
  player.x = 0; player.z = 0; player.angle = 0;
  player.health       = MAX_HEALTH; player.alive = true;
  player.speed        = 6;          player.spitCooldown = 0;
  player.shieldTimer  = 0;          player.bigSpitTimer = 0;
  player.speedTimer   = 0;

  for (let s = 0; s < 3; s++) spawnPowerup(room);
  broadcast(room, { type: 'game_start', state: buildState(room) });

  // First wave after a short grace period
  setTimeout(() => {
    if (rooms[room.id] && room.state === 'playing') spawnWave(room);
  }, 2000);
}

/** Spawn the next wave of bots. */
function spawnWave(room) {
  room.wave++;
  const count = Math.min(room.wave + 1, 8);                    // wave 1 = 2 bots, cap at 8
  const speed = BOT_BASE_SPEED + (room.wave - 1) * 0.25;       // slightly faster each wave

  // Remove any leftover bots from the previous wave
  for (const pid of Object.keys(room.players)) {
    if (room.players[pid].isBot) delete room.players[pid];
  }

  // Drop powerups: one guaranteed heal near the player + 2 random
  room.powerups = {};
  const human = getSurvivalPlayer(room);
  if (human) {
    const healId = generateId();
    room.powerups[healId] = {
      id: healId, type: 'heal',
      x: human.x + (Math.random() - 0.5) * 5,
      z: human.z + (Math.random() - 0.5) * 5,
    };
  }
  for (let s = 0; s < 2; s++) spawnPowerup(room);

  // Spread bots evenly around the arena edge
  const BASE_TACTICS = ['charge', 'flank_left', 'flank_right', 'strafe', 'retreat'];
  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const spawnR = ARENA_RADIUS - 1.5;
    const botId  = 'bot_' + generateId();
    room.players[botId] = {
      id:    botId,
      name:  `👿 Foe ${room.wave}-${i + 1}`,
      isBot: true,
      ws:    null,
      x:     Math.sin(angle) * spawnR,
      z:     Math.cos(angle) * spawnR,
      angle: angle + Math.PI,   // face inward
      health:       MAX_HEALTH,
      alive:        true,
      speed,
      spitCooldown: 0.3 + Math.random() * 1.5,   // stagger initial shots
      shieldTimer:  0,
      bigSpitTimer: 0,
      speedTimer:   0,
      color:  BOT_COLORS[i % BOT_COLORS.length],
      vx: 0, vz: 0,
      tactic: BASE_TACTICS[i % BASE_TACTICS.length],
    };
  }

  broadcast(room, { type: 'wave_start', wave: room.wave, botCount: count, state: buildState(room) });

  // Kick off Groq tactic refresh for this wave immediately
  runGroqTactics(room);
}

// ── Bot movement / shooting ───────────────────────────────────────────────────

/**
 * Returns a normalised {vx, vz} movement vector for a bot given its current tactic.
 * All maths is O(1) per bot, executed every 20 ms.
 */
function computeBotVelocity(bot, target, tactic) {
  const dx   = target.x - bot.x;
  const dz   = target.z - bot.z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
  const tx = dx / dist;   // unit vec toward player
  const tz = dz / dist;
  const px = -tz;         // perpendicular-left
  const pz =  tx;

  switch (tactic) {
    case 'charge':
      return { vx: tx, vz: tz };

    case 'flank_left':
      return { vx: tx * 0.4 + px * 0.9, vz: tz * 0.4 + pz * 0.9 };

    case 'flank_right':
      return { vx: tx * 0.4 - px * 0.9, vz: tz * 0.4 - pz * 0.9 };

    case 'strafe': {
      const ideal = 7;
      const pull  = dist > ideal + 2 ? 0.35 : dist < ideal - 2 ? -0.35 : 0;
      return { vx: px + tx * pull, vz: pz + tz * pull };
    }

    case 'retreat':
      if (dist < 10) return { vx: -tx * 0.6 + px * 0.8, vz: -tz * 0.6 + pz * 0.8 };
      return { vx: px, vz: pz };   // circle at distance

    default:
      return { vx: tx, vz: tz };
  }
}

/** Advance every bot one tick: move + shoot. */
function tickBots(room, dt) {
  const target = getSurvivalPlayer(room);
  if (!target) return;

  for (const bot of Object.values(room.players)) {
    if (!bot.isBot || !bot.alive) continue;

    // Movement
    const { vx, vz } = computeBotVelocity(bot, target, bot.tactic ?? 'charge');
    let nx = bot.x + vx * bot.speed * dt;
    let nz = bot.z + vz * bot.speed * dt;
    const d = Math.sqrt(nx * nx + nz * nz);
    if (d > ARENA_RADIUS - PLAYER_RADIUS) { const sc = (ARENA_RADIUS - PLAYER_RADIUS) / d; nx *= sc; nz *= sc; }
    bot.x = nx;
    bot.z = nz;

    // Always aim at the human player
    bot.angle = Math.atan2(target.x - bot.x, target.z - bot.z);

    // Shooting (cooldown managed here, cooldown counter decremented in main tick loop)
    if (bot.spitCooldown > 0) continue;

    const cooldown = (bot.tactic === 'retreat' ? 1.3 : 0.8) + Math.random() * 0.35;
    bot.spitCooldown = cooldown;
    const big = bot.bigSpitTimer > 0;
    const sid = generateId();
    room.spits[sid] = {
      id:      sid,
      ownerId: bot.id,
      x:  bot.x + Math.sin(bot.angle) * 1.2,
      z:  bot.z + Math.cos(bot.angle) * 1.2,
      vx: Math.sin(bot.angle) * SPIT_SPEED,
      vz: Math.cos(bot.angle) * SPIT_SPEED,
      life: 2.5,
      big,
    };
  }
}

/** Check if all bots in the wave are dead and schedule the next wave. */
function checkWaveClear(room) {
  if (getSurvivalBots(room).length > 0) return;
  broadcast(room, { type: 'wave_complete', wave: room.wave, kills: room.totalKills });
  setTimeout(() => {
    if (!rooms[room.id]) return;
    if (getSurvivalPlayer(room)) spawnWave(room);
  }, 3000);
}

/** Async Groq call — updates bot tactics without blocking the game loop. */
async function runGroqTactics(room) {
  if (!room.isSurvival || room.state !== 'playing') return;
  const player = getSurvivalPlayer(room);
  const bots   = getSurvivalBots(room);
  if (!player || bots.length === 0) return;

  try {
    const { fetchBotTactics } = await import('./groqAI.js');
    const tactics = await fetchBotTactics(player, bots);
    for (const [id, tactic] of Object.entries(tactics)) {
      if (room.players[id]) room.players[id].tactic = tactic;
    }
    console.log('[groq] wave', room.wave, '→', Object.values(tactics).join(' | '));
  } catch {
    /* silent — bots keep their current tactic */
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  WebSocket connections
// ════════════════════════════════════════════════════════════════════════════

wss.on('connection', (ws) => {
  const playerId = generateId();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Join multiplayer ──────────────────────────────
    if (msg.type === 'join') {
      const room = findOrCreateRoom();
      room.players[playerId] = {
        id:    playerId,
        name:  msg.name || `Alpaca_${playerId.slice(0, 4)}`,
        ws,
        x: 0, z: 0, angle: 0,
        health: MAX_HEALTH, alive: true,
        speed: 6, spitCooldown: 0,
        shieldTimer: 0, bigSpitTimer: 0, speedTimer: 0,
        color: 0xf4a261, vx: 0, vz: 0,
        isBot: false,
      };
      playerRoom[playerId] = room.id;

      ws.send(JSON.stringify({ type: 'joined', playerId, roomId: room.id, state: buildState(room) }));
      broadcast(room, { type: 'player_joined', id: playerId, name: room.players[playerId].name, state: buildState(room) });

      const count = Object.keys(room.players).length;
      if (count >= 2 && room.state === 'lobby') {
        if (room.startTimer) clearTimeout(room.startTimer);
        room.startTimer = setTimeout(() => { if (room.state === 'lobby') startGame(room); }, 3000);
        broadcast(room, { type: 'countdown', seconds: 3 });
      } else if (count === 1) {
        if (room.startTimer) clearTimeout(room.startTimer);
        room.startTimer = setTimeout(() => { if (room.state === 'lobby' && Object.keys(room.players).length >= 1) startGame(room); }, 10000);
        broadcast(room, { type: 'countdown', seconds: 10 });
      }
    }

    // ── Join survival ─────────────────────────────────
    if (msg.type === 'join_survival') {
      const id   = generateId();
      const room = createSurvivalRoom(id);
      rooms[id]  = room;

      room.players[playerId] = {
        id:    playerId,
        name:  msg.name || `Alpaca_${playerId.slice(0, 4)}`,
        ws,
        x: 0, z: 0, angle: 0,
        health: MAX_HEALTH, alive: true,
        speed: 6, spitCooldown: 0,
        shieldTimer: 0, bigSpitTimer: 0, speedTimer: 0,
        color: 0xf4a261, vx: 0, vz: 0,
        isBot: false,
      };
      playerRoom[playerId] = id;

      room.tickInterval = setInterval(() => tickRoom(room), TICK_RATE);
      // Periodically refresh Groq tactics while the game is running
      room.groqInterval = setInterval(() => runGroqTactics(room), GROQ_TICK_MS);

      ws.send(JSON.stringify({ type: 'joined', playerId, roomId: id, isSurvival: true, state: buildState(room) }));
      startSurvival(room);
    }

    // ── Player input (both modes) ─────────────────────
    if (msg.type === 'input') {
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room   = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;

      const speed = player.speed;
      const dt    = TICK_RATE / 1000;
      let nx = player.x + (msg.vx || 0) * speed * dt;
      let nz = player.z + (msg.vz || 0) * speed * dt;
      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > ARENA_RADIUS - PLAYER_RADIUS) { const sc = (ARENA_RADIUS - PLAYER_RADIUS) / dist; nx *= sc; nz *= sc; }
      player.x = nx; player.z = nz;
      if (msg.angle !== undefined) player.angle = msg.angle;
    }

    // ── Spit (both modes) ─────────────────────────────
    if (msg.type === 'spit') {
      const roomId = playerRoom[playerId];
      if (!roomId || !rooms[roomId]) return;
      const room   = rooms[roomId];
      const player = room.players[playerId];
      if (!player || !player.alive || room.state !== 'playing') return;
      if (player.spitCooldown > 0) return;

      const big = player.bigSpitTimer > 0;
      player.spitCooldown = big ? 0.4 : 0.6;

      const sid   = generateId();
      const angle = msg.angle ?? player.angle;
      room.spits[sid] = {
        id:      sid,
        ownerId: playerId,
        x:  player.x + Math.sin(angle) * 1.2,
        z:  player.z + Math.cos(angle) * 1.2,
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

loadVaultSecrets().then(() => {
  server.listen(PORT, () => console.log(`🦙 Alpaca Spit Royale server on ws://localhost:${PORT}/ws`));
});
