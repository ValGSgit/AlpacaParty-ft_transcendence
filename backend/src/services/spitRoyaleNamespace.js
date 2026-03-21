import AuthService from './authService.js';
import User from '../models/User.js';
import Game from '../models/Game.js';
import GamificationService from './gamificationService.js';

const TICK_RATE = 20;
const ARENA_RADIUS = 18;
const SPIT_SPEED = 14;
const SPIT_DAMAGE = 20;
const SPIT_RADIUS = 0.35;
const PLAYER_RADIUS = 0.8;
const POWERUP_TYPES = ['speed', 'shield', 'bigSpit', 'heal'];
const MAX_HEALTH = 100;

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
    if (match.metrics[player.id]) {
      match.metrics[player.id].powerupsCollected += 1;
    }
    broadcast(match, { type: 'powerup_collected', playerId: player.id, powerupType: type });
  }

  function startMatch(match) {
    match.state = 'playing';
    match.winner = null;
    match.startedAtMs = Date.now();

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
    for (let i = 0; i < 4; i += 1) spawnPowerup(match);

    broadcast(match, { type: 'game_start', state: buildState(match) });
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

    const [p1Reward, p2Reward] = await Promise.all([
      GamificationService.processGameEnd(player1.userId, p1Result, 'spit_royale', p1Context),
      GamificationService.processGameEnd(player2.userId, p2Result, 'spit_royale', p2Context),
      Game.updateStats(player1.userId, 'spit_royale', p1Result),
      Game.updateStats(player2.userId, 'spit_royale', p2Result),
      Game.updateElo(player1.userId, 'spit_royale', newP1Elo),
      Game.updateElo(player2.userId, 'spit_royale', newP2Elo),
    ]);

    return {
      byPlayerId: {
        [player1.id]: { ...p1Reward, elo: { from: p1Stats.elo, to: newP1Elo } },
        [player2.id]: { ...p2Reward, elo: { from: p2Stats.elo, to: newP2Elo } },
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
      rewards: rewards?.byPlayerId || null,
      state: buildState(match),
    });

    setTimeout(() => cleanupMatch(match.id), 3000);
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

    try {
      const dbGame = await Game.create({ player1Id: playerA.userId, gameType: 'spit_royale' });
      await Game.joinGame(dbGame.id, playerB.userId);
      match.dbGameId = dbGame.id;
      match.dbPlayer1Id = playerA.userId;
      match.dbPlayer2Id = playerB.userId;
    } catch {
      match.dbGameId = null;
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
      void finalizeMatch(match, winner.id, 'disconnect');
      return;
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
        void pairPlayers(waiting, player);
      } else {
        waitingPlayerId = playerId;
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