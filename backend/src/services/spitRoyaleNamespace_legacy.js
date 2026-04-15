import AuthService from './authService.js';
import User from '../models/User.js';
import Game from '../models/Game.js';

const TICK_RATE = 20;
const ARENA_RADIUS = 18;
const SPIT_SPEED = 14;
const SPIT_DAMAGE = 20;
const SPIT_RADIUS = 0.35;
const PLAYER_RADIUS = 0.8;
const POWERUP_TYPES = ['speed', 'shield', 'bigSpit', 'heal', 'tripleSpit'];
const MAX_HEALTH = 100;
const REMATCH_WINDOW_MS = 15000;
const DISCONNECT_GRACE_MS = 15000;
const SUDDEN_DEATH_SEC = 90;

// ── Survival-mode constants ──────────────────────────────────────────────────
const BOT_COLORS   = [0xc62828, 0x880e4f, 0x1a237e, 0x004d40, 0x33691e];
const BOT_BASE_SPEED = 3.2;
const BOT_TACTICS  = ['charge', 'flank_left', 'flank_right', 'strafe', 'retreat', 'dodge'];

function calcElo(playerElo, opponentElo, result) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  return Math.round(playerElo + K * (score - expected));
}

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
    createdAtMs: Date.now(),
    startedAtMs: null,
    dbGameId: null,
    dbPlayer1Id: null,
    dbPlayer2Id: null,
    finalized: false,
    metrics: {},
    rematchVotes: new Set(),
    endCleanupTimer: null,
    countdownTimers: [],
    spectators: {},
    isSurvival: false,
    suddenDeath: false,
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
      connected: p.connected !== false,
      color: p.color,
      shieldTimer: p.shieldTimer,
      isBot: p.isBot ?? false,
    })),
    spits: Object.values(room.spits),
    powerups: Object.values(room.powerups),
    suddenDeath: room.suddenDeath ?? false,
    ...(room.isSurvival ? { wave: room.wave, totalKills: room.totalKills } : {}),
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

// ── Bot AI (survival) ────────────────────────────────────────────────────────

function computeBotVelocity(bot, target, tactic, incomingSpits = []) {
  const dx   = target.x - bot.x;
  const dz   = target.z - bot.z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
  const tx = dx / dist;
  const tz = dz / dist;
  const px = -tz;
  const pz =  tx;

  switch (tactic) {
    case 'charge':      return { vx: tx, vz: tz };
    case 'flank_left':  return { vx: tx * 0.4 + px * 0.9, vz: tz * 0.4 + pz * 0.9 };
    case 'flank_right': return { vx: tx * 0.4 - px * 0.9, vz: tz * 0.4 - pz * 0.9 };
    case 'strafe': {
      const ideal = 7;
      const pull  = dist > ideal + 2 ? 0.35 : dist < ideal - 2 ? -0.35 : 0;
      return { vx: px + tx * pull, vz: pz + tz * pull };
    }
    case 'retreat':
      return dist < 10
        ? { vx: -tx * 0.6 + px * 0.8, vz: -tz * 0.6 + pz * 0.8 }
        : { vx: px, vz: pz };
    case 'dodge': {
      // Sidestep the nearest incoming spit; fall back to strafe otherwise
      let bestDodge = null;
      let minTime = Infinity;
      for (const spit of incomingSpits) {
        if (spit.ownerId === bot.id) continue;
        const sdx = bot.x - spit.x;
        const sdz = bot.z - spit.z;
        const spitDist = Math.sqrt(sdx * sdx + sdz * sdz);
        if (spitDist > 10) continue;
        const spitSpeed = Math.sqrt(spit.vx * spit.vx + spit.vz * spit.vz) || 1;
        const nvx = spit.vx / spitSpeed;
        const nvz = spit.vz / spitSpeed;
        const dot = nvx * (-sdx / (spitDist || 1)) + nvz * (-sdz / (spitDist || 1));
        if (dot > 0.55) {
          const timeToHit = spitDist / spitSpeed;
          if (timeToHit < minTime) {
            minTime = timeToHit;
            bestDodge = { vx: nvz, vz: -nvx }; // perpendicular to spit direction
          }
        }
      }
      if (bestDodge && minTime < 0.55) return bestDodge;
      const ideal = 7;
      const pull = dist > ideal + 2 ? 0.35 : dist < ideal - 2 ? -0.35 : 0;
      return { vx: px + tx * pull, vz: pz + tz * pull };
    }
    default: return { vx: tx, vz: tz };
  }
}

function tickBots(room, dt) {
  const target = Object.values(room.players).find((p) => !p.isBot && p.alive);
  if (!target) return;

  for (const bot of Object.values(room.players)) {
    if (!bot.isBot || !bot.alive) continue;

    const { vx, vz } = computeBotVelocity(bot, target, bot.tactic ?? 'charge', Object.values(room.spits));
    let nx = bot.x + vx * bot.speed * dt;
    let nz = bot.z + vz * bot.speed * dt;
    const d = Math.sqrt(nx * nx + nz * nz);
    if (d > ARENA_RADIUS - PLAYER_RADIUS) {
      const sc = (ARENA_RADIUS - PLAYER_RADIUS) / d;
      nx *= sc; nz *= sc;
    }
    bot.x = nx; bot.z = nz;
    bot.angle = Math.atan2(target.x - bot.x, target.z - bot.z);

    if (bot.spitCooldown > 0) continue;
    bot.spitCooldown = (bot.tactic === 'retreat' ? 1.3 : 0.8) + Math.random() * 0.35;

    const sid = generateId();
    room.spits[sid] = {
      id: sid,
      ownerId: bot.id,
      x:  bot.x + Math.sin(bot.angle) * 1.2,
      z:  bot.z + Math.cos(bot.angle) * 1.2,
      vx: Math.sin(bot.angle) * SPIT_SPEED,
      vz: Math.cos(bot.angle) * SPIT_SPEED,
      life: 2.5,
      big: bot.bigSpitTimer > 0,
    };
  }
}

export function initializeSpitRoyaleNamespace(io) {
  const namespace = io.of('/spit-royale');
  const queuedPlayers = new Map();
  const queueOrder = [];
  const matches = new Map();
  const playerToMatch = new Map();
  const survivalRooms = new Map(); // socket.id → survival room

  function buildLiveMatches() {
    return Array.from(matches.values()).map((match) => {
      const players = Object.values(match.players).map((p) => ({
        id: p.id,
        name: p.name,
        health: p.health,
        alive: p.alive,
        connected: p.connected !== false,
      }));

      return {
        id: match.id,
        state: match.state,
        winner: match.winner,
        playerCount: players.length,
        spectators: Object.keys(match.spectators || {}).length,
        players,
      };
    });
  }

  function emitLiveMatches(socket = null) {
    const payload = { type: 'live_matches', matches: buildLiveMatches() };
    if (socket) socket.emit('spit:message', payload);
    else namespace.emit('spit:message', payload);
  }

  function removeSpectator(socket, { leaveRoom = true } = {}) {
    const matchId = socket.data.spectatingMatchId;
    if (!matchId) return;

    const match = matches.get(matchId);
    if (match && match.spectators[socket.id]) {
      delete match.spectators[socket.id];
      if (leaveRoom) socket.leave(match.socketRoom);
      broadcast(match, {
        type: 'spectators_update',
        matchId,
        count: Object.keys(match.spectators).length,
      });
    }
    socket.data.spectatingMatchId = null;
    socket.emit('spit:message', { type: 'spectator_left' });
    emitLiveMatches();
  }

  function broadcast(match, msg) {
    namespace.to(match.socketRoom).emit('spit:message', msg);
  }

  function cleanupMatch(matchId) {
    const match = matches.get(matchId);
    if (!match) return;
    if (match.tickInterval) clearInterval(match.tickInterval);
    if (match.powerupInterval) clearInterval(match.powerupInterval);
    if (match.startTimer) clearTimeout(match.startTimer);
    if (match.endCleanupTimer) clearTimeout(match.endCleanupTimer);
    for (const t of match.countdownTimers ?? []) clearTimeout(t);
    for (const pid of Object.keys(match.players)) {
      const player = match.players[pid];
      if (player?.disconnectTimer) clearTimeout(player.disconnectTimer);
      playerToMatch.delete(pid);
    }
    for (const sid of Object.keys(match.spectators || {})) {
      delete match.spectators[sid];
    }
    matches.delete(matchId);
    emitLiveMatches();
  }

  function broadcastQueueSize() {
    const count = queueOrder.filter((pid) => queuedPlayers.has(pid)).length;
    for (const player of queuedPlayers.values()) {
      player.socket.emit('spit:message', { type: 'queue_waiting', queueSize: count });
    }
  }

  function enqueuePlayer(player) {
    queuedPlayers.set(player.id, player);
    if (!queueOrder.includes(player.id)) queueOrder.push(player.id);
    broadcastQueueSize();
  }

  function unqueuePlayer(playerId) {
    queuedPlayers.delete(playerId);
    const idx = queueOrder.indexOf(playerId);
    if (idx >= 0) queueOrder.splice(idx, 1);
    broadcastQueueSize();
  }

  function nextQueuedPlayer() {
    while (queueOrder.length > 0) {
      const candidateId = queueOrder.shift();
      const player = queuedPlayers.get(candidateId);
      if (player) {
        queuedPlayers.delete(candidateId);
        return player;
      }
    }
    return null;
  }

  function tryPairQueuedPlayers() {
    const first = nextQueuedPlayer();
    if (!first) return;
    const second = nextQueuedPlayer();
    if (!second) {
      enqueuePlayer(first);
      return;
    }
    void pairPlayers(first, second);
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
    } else if (type === 'tripleSpit') {
      player.tripleSpitTimer = 10;
    }
    if (match.metrics[player.id]) {
      match.metrics[player.id].powerupsCollected += 1;
    }
    broadcast(match, { type: 'powerup_collected', playerId: player.id, powerupType: type });
  }

  function startMatch(match) {
    if (match.endCleanupTimer) {
      clearTimeout(match.endCleanupTimer);
      match.endCleanupTimer = null;
    }
    match.state = 'playing';
    match.winner = null;
    match.startedAtMs = Date.now();
    match.finalized = false;
    match.rematchVotes.clear();

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
      player.tripleSpitTimer = 0;
      player.color = colors[i % colors.length];
      player.connected = true;

      if (!match.metrics[player.id]) {
        match.metrics[player.id] = {
          hits: 0,
          eliminations: 0,
          powerupsCollected: 0,
          damageDealt: 0,
          damageTaken: 0,
        };
      }
    }

    match.spits = {};
    match.powerups = {};
    match.suddenDeath = false;
    for (let i = 0; i < 4; i += 1) spawnPowerup(match);

    broadcast(match, { type: 'game_start', state: buildState(match) });
    emitLiveMatches();
  }

  async function persistMatchOutcome(match, winnerPlayerId, reason = 'elimination') {
    const pids = Object.keys(match.players);
    if (pids.length < 2) return null;

    const player1 = match.players[pids[0]];
    const player2 = match.players[pids[1]];
    const winnerUserId = winnerPlayerId ? match.players[winnerPlayerId]?.userId : null;

    let p1Result = 'draw';
    let p2Result = 'draw';
    let p1Score = 0;
    let p2Score = 0;

    if (winnerUserId && winnerUserId === player1.userId) {
      p1Result = 'win';
      p2Result = 'loss';
      p1Score = 1;
      p2Score = 0;
    } else if (winnerUserId && winnerUserId === player2.userId) {
      p1Result = 'loss';
      p2Result = 'win';
      p1Score = 0;
      p2Score = 1;
    }

    if (match.dbGameId) {
      await Game.finishGame(match.dbGameId, {
        winnerId: winnerUserId,
        player1Score: p1Score,
        player2Score: p2Score,
      });
    }

    const [p1Stats, p2Stats] = await Promise.all([
      Game.getStats(player1.userId, 'spit_royale'),
      Game.getStats(player2.userId, 'spit_royale'),
    ]);

    const newP1Elo = calcElo(p1Stats.elo, p2Stats.elo, p1Result);
    const newP2Elo = calcElo(p2Stats.elo, p1Stats.elo, p2Result);

    const nowMs = Date.now();
    const startedAtMs = match.startedAtMs || match.createdAtMs || nowMs;
    const durationSec = Math.max(1, Math.floor((nowMs - startedAtMs) / 1000));

    const p1Context = {
      ...match.metrics[player1.id],
      survivedSeconds: durationSec,
      endReason: reason,
    };
    const p2Context = {
      ...match.metrics[player2.id],
      survivedSeconds: durationSec,
      endReason: reason,
    };

    await Promise.all([
      Game.updateStats(player1.userId, 'spit_royale', p1Result),
      Game.updateStats(player2.userId, 'spit_royale', p2Result),
      Game.updateElo(player1.userId, 'spit_royale', newP1Elo),
      Game.updateElo(player2.userId, 'spit_royale', newP2Elo),
    ]);

    return {
      byPlayerId: {
        [player1.id]: { elo: { from: p1Stats.elo, to: newP1Elo } },
        [player2.id]: { elo: { from: p2Stats.elo, to: newP2Elo } },
      },
      winnerUserId,
    };
  }

  async function finalizeMatch(match, winnerPlayerId, reason = 'elimination') {
    if (match.finalized) return;
    match.finalized = true;

    const winner = winnerPlayerId ? match.players[winnerPlayerId] : null;
    match.state = 'ended';
    match.winner = winner ? winner.name : 'No one';

    let rewards = null;
    try {
      rewards = await persistMatchOutcome(match, winnerPlayerId, reason);
    } catch {
      rewards = null;
    }

    broadcast(match, {
      type: 'game_over',
      winner: match.winner,
      reason,
      rematchWindowMs: REMATCH_WINDOW_MS,
      rewards: rewards?.byPlayerId || null,
      state: buildState(match),
    });
    emitLiveMatches();

    if (match.endCleanupTimer) clearTimeout(match.endCleanupTimer);
    match.endCleanupTimer = setTimeout(() => cleanupMatch(match.id), REMATCH_WINDOW_MS);
  }

  function checkWinCondition(match) {
    const alive = Object.values(match.players).filter((p) => p.alive);
    if (alive.length <= 1) {
      const winnerPlayerId = alive.length === 1 ? alive[0].id : null;
      void finalizeMatch(match, winnerPlayerId, 'elimination');
    }
  }

  function tickMatch(match) {
    if (match.state !== 'playing') return;
    const dt = TICK_RATE / 1000;

    // Sudden death: after SUDDEN_DEATH_SEC seconds, damage doubles
    if (!match.suddenDeath && match.startedAtMs && Date.now() - match.startedAtMs > SUDDEN_DEATH_SEC * 1000) {
      match.suddenDeath = true;
      broadcast(match, { type: 'sudden_death', state: buildState(match) });
    }
    const damageMultiplier = match.suddenDeath ? 2 : 1;

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
            const dmg = (spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE) * damageMultiplier;
            player.health = Math.max(0, player.health - dmg);
            if (match.metrics[player.id]) match.metrics[player.id].damageTaken += dmg;
            if (match.metrics[spit.ownerId]) {
              match.metrics[spit.ownerId].hits += 1;
              match.metrics[spit.ownerId].damageDealt += dmg;
            }
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
              if (match.metrics[spit.ownerId]) match.metrics[spit.ownerId].eliminations += 1;
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
      if (player.tripleSpitTimer > 0) player.tripleSpitTimer -= dt;
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

  async function initializeDbGame(match, playerA, playerB) {
    try {
      const dbGame = await Game.create({ player1Id: playerA.userId, gameType: 'spit_royale' });
      await Game.joinGame(dbGame.id, playerB.userId);
      match.dbGameId = dbGame.id;
      match.dbPlayer1Id = playerA.userId;
      match.dbPlayer2Id = playerB.userId;
    } catch {
      match.dbGameId = null;
    }
  }

  async function pairPlayers(playerA, playerB) {
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

    match.metrics[playerA.id] = {
      hits: 0,
      eliminations: 0,
      powerupsCollected: 0,
      damageDealt: 0,
      damageTaken: 0,
    };
    match.metrics[playerB.id] = {
      hits: 0,
      eliminations: 0,
      powerupsCollected: 0,
      damageDealt: 0,
      damageTaken: 0,
    };

    await initializeDbGame(match, playerA, playerB);
    playerA.connected = true;
    playerB.connected = true;

    // Pre-position players at their spawn spots so the joined state is accurate
    const spawnColors = [0xf4a261, 0x2a9d8f];
    const spawnSpots = [
      { x: -8, z: 0, angle: Math.PI / 2 },
      { x: 8, z: 0, angle: -Math.PI / 2 },
    ];
    const pairPids = Object.keys(match.players);
    for (let i = 0; i < pairPids.length; i += 1) {
      const p = match.players[pairPids[i]];
      p.x = spawnSpots[i].x;
      p.z = spawnSpots[i].z;
      p.angle = spawnSpots[i].angle;
      p.color = spawnColors[i % spawnColors.length];
    }

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
    match.countdownTimers = [
      setTimeout(() => broadcast(match, { type: 'countdown', seconds: 2 }), 1000),
      setTimeout(() => broadcast(match, { type: 'countdown', seconds: 1 }), 2000),
    ];

    match.startTimer = setTimeout(() => startMatch(match), 3000);
    match.tickInterval = setInterval(() => tickMatch(match), TICK_RATE);
    match.powerupInterval = setInterval(() => {
      if (match.state === 'playing' && Object.keys(match.powerups).length < 5) {
        spawnPowerup(match);
      }
    }, 8000);

    broadcastQueueSize();
    emitLiveMatches();
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

    const player = match.players[playerId];
    if (!player) {
      playerToMatch.delete(playerId);
      return;
    }

    player.connected = false;
    broadcast(match, {
      type: 'player_disconnected',
      playerId,
      graceMs: DISCONNECT_GRACE_MS,
      state: buildState(match),
    });
    emitLiveMatches();

    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    player.disconnectTimer = setTimeout(() => {
      const currentMatch = matches.get(matchId);
      if (!currentMatch) return;
      const currentPlayer = currentMatch.players[playerId];
      if (!currentPlayer || currentPlayer.connected) return;

      delete currentMatch.players[playerId];
      playerToMatch.delete(playerId);

      const remaining = Object.values(currentMatch.players);
      if (remaining.length === 1) {
        void finalizeMatch(currentMatch, remaining[0].id, 'disconnect_timeout');
      } else if (remaining.length === 0) {
        cleanupMatch(matchId);
      } else {
        broadcast(currentMatch, { type: 'tick', state: buildState(currentMatch) });
      }
      emitLiveMatches();
    }, DISCONNECT_GRACE_MS);
  }

  // ── Survival helpers ────────────────────────────────────────────────────────

  function createSurvivalRoom(socketId) {
    return {
      socketId,
      socketRoom: `spit-survival:${socketId}`,
      players:  {},
      spits:    {},
      powerups: {},
      state:      'lobby',
      isSurvival: true,
      wave:       0,
      totalKills: 0,
      tickInterval: null,
    };
  }

  function spawnSurvivalWave(room, socket) {
    room.wave++;
    const count = Math.min(room.wave + 1, 8);
    const speed = BOT_BASE_SPEED + (room.wave - 1) * 0.25;

    for (const pid of Object.keys(room.players)) {
      if (room.players[pid].isBot) delete room.players[pid];
    }

    room.powerups = {};
    const human = Object.values(room.players).find((p) => !p.isBot && p.alive);
    if (human) {
      const healId = generateId();
      room.powerups[healId] = {
        id: healId, type: 'heal',
        x: human.x + (Math.random() - 0.5) * 5,
        z: human.z + (Math.random() - 0.5) * 5,
      };
    }
    for (let s = 0; s < 2; s++) spawnPowerup(room);

    for (let i = 0; i < count; i++) {
      const angle  = (i / count) * Math.PI * 2;
      const spawnR = ARENA_RADIUS - 1.5;
      const botId  = `bot_${generateId()}`;
      room.players[botId] = {
        id: botId,
        name: `👿 Foe ${room.wave}-${i + 1}`,
        isBot: true,
        x: Math.sin(angle) * spawnR,
        z: Math.cos(angle) * spawnR,
        angle: angle + Math.PI,
        health: MAX_HEALTH,
        alive:  true,
        speed,
        spitCooldown: 0.3 + Math.random() * 1.5,
        shieldTimer:  0,
        bigSpitTimer: 0,
        speedTimer:   0,
        color:  BOT_COLORS[i % BOT_COLORS.length],
        tactic: BOT_TACTICS[i % BOT_TACTICS.length],
      };
    }

    socket.emit('spit:message', {
      type: 'wave_start', wave: room.wave, botCount: count, state: buildState(room),
    });
  }

  function checkSurvivalWaveClear(room, socket) {
    if (Object.values(room.players).some((p) => p.isBot && p.alive)) return;
    socket.emit('spit:message', { type: 'wave_complete', wave: room.wave, kills: room.totalKills });
    setTimeout(() => {
      if (!survivalRooms.has(room.socketId)) return;
      if (Object.values(room.players).some((p) => !p.isBot && p.alive)) {
        spawnSurvivalWave(room, socket);
      }
    }, 3000);
  }

  function startSurvivalGame(room, socket) {
    room.state      = 'playing';
    room.wave       = 0;
    room.totalKills = 0;
    room.spits      = {};
    room.powerups   = {};

    const human = Object.values(room.players).find((p) => !p.isBot);
    if (!human) return;
    human.x = 0; human.z = 0; human.angle = 0;
    human.health = MAX_HEALTH; human.alive = true;
    human.speed = 6; human.spitCooldown = 0;
    human.shieldTimer = 0; human.bigSpitTimer = 0; human.speedTimer = 0;

    for (let s = 0; s < 3; s++) spawnPowerup(room);
    socket.emit('spit:message', { type: 'game_start', state: buildState(room) });

    setTimeout(() => {
      if (!survivalRooms.has(room.socketId) || room.state !== 'playing') return;
      spawnSurvivalWave(room, socket);
    }, 2000);
  }

  function tickSurvivalRoom(room, socket) {
    if (room.state !== 'playing') return;
    const dt = TICK_RATE / 1000;

    tickBots(room, dt);

    for (const [sid, spit] of Object.entries(room.spits)) {
      spit.x += spit.vx * dt;
      spit.z += spit.vz * dt;
      spit.life -= dt;

      if (Math.sqrt(spit.x * spit.x + spit.z * spit.z) > ARENA_RADIUS || spit.life <= 0) {
        delete room.spits[sid]; continue;
      }

      let hit = false;
      for (const player of Object.values(room.players)) {
        if (!player.alive || player.id === spit.ownerId) continue;
        if (player.isBot && room.players[spit.ownerId]?.isBot) continue; // no bot-on-bot

        const dx   = player.x - spit.x;
        const dz   = player.z - spit.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const spitR = spit.big ? SPIT_RADIUS * 2 : SPIT_RADIUS;

        if (dist < PLAYER_RADIUS + spitR) {
          if (player.shieldTimer > 0) {
            socket.emit('spit:message', { type: 'shield_block', playerId: player.id });
          } else {
            const dmg = spit.big ? SPIT_DAMAGE * 2 : SPIT_DAMAGE;
            player.health = Math.max(0, player.health - dmg);
            socket.emit('spit:message', {
              type: 'player_hit', targetId: player.id, ownerId: spit.ownerId,
              damage: dmg, x: spit.x, z: spit.z,
            });
            if (player.health <= 0) {
              player.alive = false;
              if (player.isBot) room.totalKills++;
              socket.emit('spit:message', { type: 'player_eliminated', id: player.id, killerId: spit.ownerId });

              const humanAlive = Object.values(room.players).some((p) => !p.isBot && p.alive);
              if (!humanAlive) {
                room.state = 'ended';
                socket.emit('spit:message', {
                  type: 'survival_over', wave: room.wave, kills: room.totalKills, state: buildState(room),
                });
                setTimeout(() => {
                  if (!survivalRooms.has(room.socketId)) return;
                  const p = Object.values(room.players).find((q) => !q.isBot);
                  if (p) { p.alive = true; startSurvivalGame(room, socket); }
                }, 5000);
              } else {
                checkSurvivalWaveClear(room, socket);
              }
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
      if (player.shieldTimer  > 0) player.shieldTimer  -= dt;
      if (player.bigSpitTimer > 0) player.bigSpitTimer -= dt;
      if (player.speedTimer   > 0) {
        player.speedTimer -= dt;
        if (player.speedTimer <= 0) player.speed = 6;
      }
      if (player.isBot) continue;
      if (player.tripleSpitTimer > 0) player.tripleSpitTimer -= dt;

      for (const [puid, pu] of Object.entries(room.powerups)) {
        const dx = player.x - pu.x;
        const dz = player.z - pu.z;
        if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
          const { type } = pu;
          delete room.powerups[puid];
          if (type === 'speed')        { player.speed = 12; player.speedTimer = 5; }
          else if (type === 'shield')     { player.shieldTimer = 4; }
          else if (type === 'bigSpit')    { player.bigSpitTimer = 8; }
          else if (type === 'heal')       { player.health = Math.min(MAX_HEALTH, player.health + 40); }
          else if (type === 'tripleSpit') { player.tripleSpitTimer = 10; }
          socket.emit('spit:message', { type: 'powerup_collected', playerId: player.id, powerupType: type });
          spawnPowerup(room);
        }
      }
    }

    socket.emit('spit:message', { type: 'tick', state: buildState(room) });
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
    const playerId = `u${socket.user.id}`;
    socket.data.spitPlayerId = playerId;
    socket.data.joinedOnce = false;
    socket.data.spectatingMatchId = null;

    function buildPlayerFromJoin(name) {
      const displayName = (name && String(name).trim()) || socket.user?.username || `Alpaca_${playerId.slice(0, 4)}`;

      return {
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
        tripleSpitTimer: 0,
        color: 0xf4a261,
      };
    }

    function joinQueue(name) {
      if (playerToMatch.has(playerId)) return;
      removeSpectator(socket);
      const existing = queuedPlayers.get(playerId);
      const player = existing || buildPlayerFromJoin(name);

      enqueuePlayer(player);
      socket.emit('spit:message', {
        type: 'joined',
        playerId,
        roomId: 'queue',
        state: buildState({
          state: 'lobby',
          winner: null,
          players: { [playerId]: player },
          spits: {},
          powerups: {},
        }),
      });

      socket.emit('spit:message', {
        type: 'queue_waiting',
        queueSize: queueOrder.filter((pid) => queuedPlayers.has(pid)).length,
      });

      tryPairQueuedPlayers();
    }

    function tryResumeMatch(name) {
      const matchId = playerToMatch.get(playerId);
      if (!matchId) return false;

      const match = matches.get(matchId);
      if (!match) return false;

      const player = match.players[playerId];
      if (!player) return false;

      removeSpectator(socket);
      if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = null;
      }
      player.socket = socket;
      player.connected = true;
      if (name && String(name).trim()) player.name = String(name).trim().slice(0, 20);

      socket.join(match.socketRoom);
      socket.emit('spit:message', {
        type: 'joined',
        playerId,
        roomId: matchId,
        resumed: true,
        state: buildState(match),
      });
      broadcast(match, { type: 'player_reconnected', playerId, state: buildState(match) });
      emitLiveMatches();
      return true;
    }

    socket.on('join', ({ name } = {}) => {
      if (socket.data.joinedOnce) return;
      socket.data.joinedOnce = true;
      if (tryResumeMatch(name)) return;
      joinQueue(name);
    });

    socket.on('queue:join', ({ name } = {}) => {
      if (tryResumeMatch(name)) return;
      joinQueue(name);
    });

    socket.on('queue:leave', () => {
      unqueuePlayer(playerId);
      socket.emit('spit:message', { type: 'queue_left' });
    });

    socket.on('join:survival', ({ name } = {}) => {
      // Reuse existing survival room if still alive
      if (survivalRooms.has(socket.id)) {
        const room = survivalRooms.get(socket.id);
        socket.emit('spit:message', { type: 'joined', playerId, roomId: socket.id, isSurvival: true, state: buildState(room) });
        return;
      }

      const displayName = (name && String(name).trim()) || socket.user?.username || `Alpaca_${playerId.slice(0, 4)}`;
      const room = createSurvivalRoom(socket.id);
      room.players[playerId] = {
        id: playerId,
        name: displayName.slice(0, 20),
        isBot: false,
        x: 0, z: 0, angle: 0,
        health: MAX_HEALTH, alive: true,
        speed: 6, spitCooldown: 0,
        shieldTimer: 0, bigSpitTimer: 0, speedTimer: 0, tripleSpitTimer: 0,
        color: 0xf4a261,
      };

      survivalRooms.set(socket.id, room);
      socket.join(room.socketRoom);
      socket.emit('spit:message', { type: 'joined', playerId, roomId: socket.id, isSurvival: true, state: buildState(room) });
      room.tickInterval = setInterval(() => tickSurvivalRoom(room, socket), TICK_RATE);
      startSurvivalGame(room, socket);
    });

    socket.on('rematch:request', async () => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match || match.state !== 'ended') return;

      match.rematchVotes.add(playerId);
      const playerIds = Object.keys(match.players);
      broadcast(match, {
        type: 'rematch_update',
        votes: match.rematchVotes.size,
        needed: playerIds.length,
      });

      if (playerIds.length === 2 && match.rematchVotes.size === 2) {
        const [aId, bId] = playerIds;
        const playerA = match.players[aId];
        const playerB = match.players[bId];
        if (!playerA || !playerB) return;

        await initializeDbGame(match, playerA, playerB);
        match.state = 'lobby';
        match.winner = null;
        match.finalized = false;
        match.rematchVotes.clear();
        match.metrics = {
          [playerA.id]: { hits: 0, eliminations: 0, powerupsCollected: 0, damageDealt: 0, damageTaken: 0 },
          [playerB.id]: { hits: 0, eliminations: 0, powerupsCollected: 0, damageDealt: 0, damageTaken: 0 },
        };
        if (match.endCleanupTimer) {
          clearTimeout(match.endCleanupTimer);
          match.endCleanupTimer = null;
        }

        broadcast(match, { type: 'countdown', seconds: 3, rematch: true });
        if (match.startTimer) clearTimeout(match.startTimer);
        match.startTimer = setTimeout(() => startMatch(match), 3000);
      }
    });

    socket.on('matches:list', (ack) => {
      const payload = { type: 'live_matches', matches: buildLiveMatches() };
      if (typeof ack === 'function') ack(payload);
      else socket.emit('spit:message', payload);
    });

    socket.on('spectate:join', ({ matchId } = {}, ack) => {
      if (!matchId || !matches.has(matchId)) {
        ack?.({ ok: false, error: 'Match not found' });
        return;
      }

      const match = matches.get(matchId);
      if (match.players[playerId]) {
        ack?.({ ok: false, error: 'Players cannot spectate their own match' });
        return;
      }

      unqueuePlayer(playerId);
      removeSpectator(socket);

      match.spectators[socket.id] = {
        socket,
        userId: socket.user.id,
        username: socket.user.username,
      };
      socket.data.spectatingMatchId = matchId;
      socket.join(match.socketRoom);

      socket.emit('spit:message', {
        type: 'spectator_joined',
        matchId,
        state: buildState(match),
      });
      broadcast(match, {
        type: 'spectators_update',
        matchId,
        count: Object.keys(match.spectators).length,
      });
      emitLiveMatches();
      ack?.({ ok: true });
    });

    socket.on('spectate:leave', (ack) => {
      removeSpectator(socket);
      ack?.({ ok: true });
    });

    socket.on('input', ({ vx = 0, vz = 0, angle } = {}) => {
      // Survival room takes priority
      const survivalRoom = survivalRooms.get(socket.id);
      if (survivalRoom) {
        const player = survivalRoom.players[playerId];
        if (!player || !player.alive || survivalRoom.state !== 'playing') return;
        if (!Number.isFinite(vx) || !Number.isFinite(vz)) return;
        const vecLen = Math.sqrt(vx * vx + vz * vz);
        const cvx = vecLen > 1 ? vx / vecLen : vx;
        const cvz = vecLen > 1 ? vz / vecLen : vz;
        const dt = TICK_RATE / 1000;
        let nx = player.x + cvx * player.speed * dt;
        let nz = player.z + cvz * player.speed * dt;
        const d = Math.sqrt(nx * nx + nz * nz);
        if (d > ARENA_RADIUS - PLAYER_RADIUS) { const sc = (ARENA_RADIUS - PLAYER_RADIUS) / d; nx *= sc; nz *= sc; }
        player.x = nx; player.z = nz;
        if (Number.isFinite(angle)) player.angle = angle;
        return;
      }

      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;
      const player = match.players[playerId];
      if (!player || !player.alive || match.state !== 'playing' || player.connected === false) return;

      if (!Number.isFinite(vx) || !Number.isFinite(vz)) return;

      const vecLen = Math.sqrt(vx * vx + vz * vz);
      const clampedVx = vecLen > 1 ? vx / vecLen : vx;
      const clampedVz = vecLen > 1 ? vz / vecLen : vz;

      const dt = TICK_RATE / 1000;
      let nx = player.x + clampedVx * player.speed * dt;
      let nz = player.z + clampedVz * player.speed * dt;
      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > ARENA_RADIUS - PLAYER_RADIUS) {
        const scale = (ARENA_RADIUS - PLAYER_RADIUS) / dist;
        nx *= scale;
        nz *= scale;
      }

      player.x = nx;
      player.z = nz;
      if (Number.isFinite(angle)) player.angle = angle;
    });

    socket.on('spit', ({ angle } = {}) => {
      // Survival room takes priority
      const survivalRoom = survivalRooms.get(socket.id);
      if (survivalRoom) {
        const player = survivalRoom.players[playerId];
        if (!player || !player.alive || survivalRoom.state !== 'playing') return;
        if (player.spitCooldown > 0) return;
        if (angle !== undefined && !Number.isFinite(angle)) return;
        const big = player.bigSpitTimer > 0;
        const triple = player.tripleSpitTimer > 0;
        player.spitCooldown = big ? 0.4 : 0.6;
        const shootAngle = angle ?? player.angle;
        const spreadAngles = triple
          ? [shootAngle - 0.22, shootAngle, shootAngle + 0.22]
          : [shootAngle];
        for (const sa of spreadAngles) {
          const sid = generateId();
          survivalRoom.spits[sid] = {
            id: sid, ownerId: playerId,
            x:  player.x + Math.sin(sa) * 1.2,
            z:  player.z + Math.cos(sa) * 1.2,
            vx: Math.sin(sa) * SPIT_SPEED,
            vz: Math.cos(sa) * SPIT_SPEED,
            life: 2.5, big,
          };
        }
        return;
      }

      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;
      const player = match.players[playerId];
      if (!player || !player.alive || match.state !== 'playing' || player.connected === false) return;
      if (player.spitCooldown > 0) return;
      if (angle !== undefined && !Number.isFinite(angle)) return;

      const big = player.bigSpitTimer > 0;
      const triple = player.tripleSpitTimer > 0;
      player.spitCooldown = big ? 0.4 : 0.6;

      const shootAngle = angle ?? player.angle;
      const spreadAngles = triple
        ? [shootAngle - 0.22, shootAngle, shootAngle + 0.22]
        : [shootAngle];

      for (const sa of spreadAngles) {
        const sid = generateId();
        match.spits[sid] = {
          id: sid,
          ownerId: playerId,
          x: player.x + Math.sin(sa) * 1.2,
          z: player.z + Math.cos(sa) * 1.2,
          vx: Math.sin(sa) * SPIT_SPEED,
          vz: Math.cos(sa) * SPIT_SPEED,
          life: 2.5,
          big,
        };
      }
    });

    socket.on('disconnect', () => {
      const survivalRoom = survivalRooms.get(socket.id);
      if (survivalRoom) {
        if (survivalRoom.tickInterval) clearInterval(survivalRoom.tickInterval);
        survivalRooms.delete(socket.id);
      }
      removeSpectator(socket, { leaveRoom: false });
      onPlayerLeave(playerId);
    });

    emitLiveMatches(socket);
  });
}

export default initializeSpitRoyaleNamespace;