import { debug } from '#lib/logger.js';
import { socketAuthMiddleware } from './socketAuth.js';
import Game from '../models/Game.js';

const TICK_RATE = 33;
const MAX_HEALTH = 3;
const MAX_PLAYERS = 20;
const MIN_RANKED_PLAYERS = 2;
const ARENA_RADIUS = 25;
const PLAYER_RADIUS = 2;
const ELO_K = 24;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// Free-for-all ELO: new rating vs. average opponent rating.
function calcElo(playerElo, avgOpponentElo, result) {
  const expected = 1 / (1 + Math.pow(10, (avgOpponentElo - playerElo) / 400));
  const score = result === 'win' ? 1 : 0;
  return Math.round(playerElo + ELO_K * (score - expected));
}

const matches = new Map();
const playerToMatch = new Map();

export function initializeSpitRoyaleNamespace(io) {
  const namespace = io.of('/spit-royale');


  function getValidSpawn(players) {
    for (let attempts = 0; attempts < 50; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (ARENA_RADIUS - 2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      let isOverlapping = false;
      for (const p of Object.values(players)) {
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

  async function persistOutcome(match, winnerPlayerId) {
    if (match.finalized) return;
    match.finalized = true;

    // Only rank authenticated users who actually participated.
    const participants = match.participants.filter((p) => Number.isFinite(p.userId));
    if (participants.length < MIN_RANKED_PLAYERS) return;

    // Fetch current stats once for all participants.
    const currentStats = await Promise.all(
      participants.map((p) => Game.getStats(p.userId, 'spit_royale')),
    );
    const eloByUser = new Map();
    participants.forEach((p, i) => eloByUser.set(p.userId, currentStats[i].elo ?? 1000));

    const totalElo = Array.from(eloByUser.values()).reduce((a, b) => a + b, 0);

    // Update stats + ELO for every participant.
    await Promise.all(
      participants.map(async (p) => {
        const myElo = eloByUser.get(p.userId);
        const avgOpp = participants.length > 1
          ? (totalElo - myElo) / (participants.length - 1)
          : myElo;
        const isWinner = p.playerId === winnerPlayerId;
        const result = isWinner ? 'win' : 'loss';
        const newElo = calcElo(myElo, avgOpp, result);
        await Game.updateStats(p.userId, 'spit_royale', result);
        await Game.updateElo(p.userId, 'spit_royale', newElo);
      }),
    );
  }

  function endMatch(match, winnerPlayerId, reason = 'elimination') {
    if (match.ended) return;
    match.ended = true;
    if (match.interval) clearInterval(match.interval);

    const winner = winnerPlayerId ? match.players[winnerPlayerId] : null;
    namespace.to(match.id).emit('game:message', {
      type: 'match_over',
      reason,
      winnerId: winnerPlayerId || null,
      winnerName: winner?.name || null,
      scoreboard: Object.values(match.players).map((p) => ({
        id: p.id, name: p.name, points: p.point, alive: p.alive,
      })),
    });

    persistOutcome(match, winnerPlayerId).catch((err) => {
      console.error('[spit-royale] failed to persist outcome:', err.message);
    });

    // Leave the match rotating; clean it up after a short grace period.
    setTimeout(() => {
      for (const pid of Object.keys(match.players)) playerToMatch.delete(pid);
      matches.delete(match.id);
    }, 5000);
  }

  function checkWinCondition(match) {
    if (match.ended) return;
    const alive = Object.values(match.players).filter((p) => p.alive);
    // Only end the match once it had at least 2 participants and collapses
    // down to 1 (or 0). This prevents a solo joiner from auto-winning.
    if (match.participants.length >= MIN_RANKED_PLAYERS && alive.length <= 1) {
      endMatch(match, alive[0]?.id ?? null, 'last_alpaca_standing');
    }
  }

  namespace.use(socketAuthMiddleware());

  namespace.on('connection', (socket) => {
    const playerId = `p${socket.id}`;

    // lobby
    socket.on('check-lobby', () => {
        const lobbyList = Array.from(matches.values()).filter(m => Object.keys(m.players).length < MAX_PLAYERS).map(m => ({
            matchid: m.id,
            roomName: m.roomName,
            state: m.state,
            playerCount: Object.keys(m.players).length
          }));
        
        // Send the whole list in one go
        socket.emit('lobby:list', lobbyList);
    });

    // 1. JOINING THE ARENA
    socket.on('join', ({ name, roomId } = {}) => {
      // cleanup
      if (playerToMatch.has(playerId)) {
        const oldMatchId = playerToMatch.get(playerId);
        const oldMatch = matches.get(oldMatchId);
        if (oldMatch) {
          delete oldMatch.players[playerId];
          if (Object.keys(oldMatch.players).length === 0) {
            clearInterval(oldMatch.interval);
            matches.delete(oldMatchId);
          }
        }
        playerToMatch.delete(playerId);
      }
      if (playerToMatch.has(playerId)) return;

      // Only join an open, not-yet-ended match.
      let matchToJoin = Array.from(matches.values()).find(
        (m) => !m.ended && Object.keys(m.players).length < MAX_PLAYERS,
      );

      if (!matchToJoin || roomId === -1) {
        const matchId = generateId();
        matchToJoin = {
          id: matchId,
          roomName: `${name}'s Room`,
          state: 'playing',
          players: {},
          participants: [],   // { playerId, userId, name } — everyone who ever joined
          ended: false,
          finalized: false,
          interval: null,
        };
        matchToJoin.interval = setInterval(() => gameLoop(matchToJoin), TICK_RATE);
        matches.set(matchId, matchToJoin);
        debug("New roomId", matchId)
      }
      else if (roomId)
      {
        debug("roomId", roomId)
        matchToJoin = Array.from(matches.values()).find(m => m.id === roomId);
        matches.set(roomId, matchToJoin);
      }

      const spawn = getValidSpawn(matchToJoin.players);
      const newPlayer = {
        id: playerId,
        matchId: matchToJoin.id,
        socket,
        userId: socket.user?.id ?? null,
        name: name || socket.user?.username || 'Vue_Llama',
        x: spawn.x, y: 0, z: spawn.z, angle: spawn.angle,
        health: MAX_HEALTH,
        alive: true,
        point: 0,
      };

      matchToJoin.players[playerId] = newPlayer;
      matchToJoin.participants.push({
        playerId,
        userId: socket.user?.id ?? null,
        name: newPlayer.name,
      });
      playerToMatch.set(playerId, matchToJoin.id);
      socket.join(matchToJoin.id);

      socket.emit('game:message', {
        type: 'joined',
        playerId,
        matchId: matchToJoin.id,
        spawn: { x: spawn.x, z: spawn.z, angle: spawn.angle },
      });
    });

    socket.on('input', ({ x, y, z, angle }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match || match.ended) return;

      const player = match.players[playerId];
      if (!player || !player.alive) return;

      if (x !== undefined) player.x = x;
      if (y !== undefined) player.y = y;
      if (z !== undefined) player.z = z;
      if (angle !== undefined) player.angle = angle;
    });

    socket.on('spit', () => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (match && !match.ended) {
        socket.broadcast.to(match.id).emit('game:message', { type: 'player_spit', playerId });
      }
    });

    socket.on('spit_hit', ({ targetId, ownerId }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match || match.ended) return;

      const target = match.players[targetId];
      if (!target || !target.alive) return;

      target.health -= 1;

      if (target.health <= 0) {
        if (match.players[ownerId]) match.players[ownerId].point++;
        target.alive = false;
        target.socket.emit('game:message', { type: 'game_over', reason: 'eliminated' });
      }

      namespace.to(match.id).emit('game:message', {
        type: 'player_hit',
        targetId,
        health: target.health,
        ownerId,
        point: match.players[ownerId]?.point ?? 0,
      });

      //if (!target.alive) checkWinCondition(match);
    });

    socket.on('disconnect', () => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (match) removePlayer(playerId, match);
    });
  });

  function removePlayer(pid, match) {
    const player = match.players[pid];
    if (!player) return;

    player.socket.leave(match.id);
    // Mark as eliminated on disconnect so the win-check can finalize properly.
    player.alive = false;
    delete match.players[pid];
    playerToMatch.delete(pid);

    if (Object.keys(match.players).length === 0) {
      // Nobody left — end the match. Winner is whoever survived last, if anyone.
      if (!match.ended) endMatch(match, null, 'empty');
      if (match.interval) clearInterval(match.interval);
      matches.delete(match.id);
      return;
    }

    //checkWinCondition(match);
  }

  function gameLoop(match) {
    if (match.ended) return;
    const state = {
      players: Object.values(match.players).map((p) => ({
        id: p.id, name: p.name, x: p.x, y: p.y || 0, z: p.z,
        angle: p.angle, health: p.health, point: p.point,
      })),
    };
    namespace.to(match.id).emit('game:message', { type: 'tick', state });
  }
}
export default initializeSpitRoyaleNamespace;
