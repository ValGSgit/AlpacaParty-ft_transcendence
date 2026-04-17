import { socketAuthMiddleware } from './socketAuth.js';

const TICK_RATE = 33;
const MAX_HEALTH = 3;
const MAX_PLAYERS = 4;
const playerPositions = [2.5, -2.5, -7.5, 7.5];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function initializeAlpacaRoadNamespace(io) {
  const namespace = io.of('/alpaca-road');

  // Keep track of ongoing matches
  const matches = new Map();
  const playerToMatch = new Map();

  // --- HELPER: Random Non-Overlapping Spawn ---
  function getValidSpawn(players) {
    const existingPlayers = Object.values(players).length
    const x = playerPositions[existingPlayers]
    return { x, z: 0, angle: 0 };
  }

  namespace.use(socketAuthMiddleware());

  namespace.on('connection', (socket) => {
    const playerId = `u${socket.user?.id || generateId()}`;

    // ready
    socket.on('ready', ({ id, ready } = {}) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

      if (match.players[id])
        match.players[id].isReady = ready

      const allReady = Object.values(match.players).every(player => player.isReady === true);
      if (allReady && Object.keys(match.players).length > 1) { // Also check for minimum players
        namespace.to(match.roomName).emit('game:start', { msg: "Everyone is ready! Starting..." });
        match.state = 'playing';
      }
    });

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
      if (playerToMatch.has(playerId)) return;

      // Find a match that isn't full, or create a new one
      let matchToJoin = Array.from(matches.values()).find(m => Object.keys(m.players).length < MAX_PLAYERS);

      if (!matchToJoin || roomId === -1) {
        const matchId = generateId();
        matchToJoin = {
          id: matchId,
          roomName: `${name}'s Room`,
          state: 'waiting',
          players: {},
          interval: setInterval(() => gameLoop(matchToJoin), TICK_RATE)
        };
        matches.set(matchId, matchToJoin);
        console.log("New roomId", matchId)
      }
      else if (roomId)
      {
        console.log("roomId", roomId)
        matchToJoin = Array.from(matches.values()).find(m => m.id === roomId);
        matches.set(roomId, matchToJoin);
      }

      const spawn = getValidSpawn(matchToJoin.players);

      const newPlayer = {
        id: playerId,
        socket,
        name: name || socket.user?.username || 'Vue_Llama',
        x: spawn.x, y: 0, z: spawn.z, angle: spawn.angle,
        health: MAX_HEALTH,
        alive: true,
        point: 0,
        isReady: false
      };

      matchToJoin.players[playerId] = newPlayer;
      playerToMatch.set(playerId, matchToJoin.id);
      socket.join(matchToJoin.roomName);

      socket.emit('game:message', {
        type: 'joined',
        playerId,
        spawn: { x: spawn.x, z: spawn.z, angle: spawn.angle }
      });
    });

    socket.on('input', ({ x, y, z, angle }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

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
      if (match) socket.broadcast.to(match.roomName).emit('game:message', { type: 'player_spit', playerId });
    });

    socket.on('spit_hit', ({ targetId, ownerId }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

      const target = match.players[targetId];
      if (target && target.alive) {
        target.health -= 1;
        
        if (target.health <= 0) {
          if (match.players[ownerId])
            match.players[ownerId].point++
          target.alive = false;
          target.socket.emit('game:message', { type: 'game_over', reason: 'eliminated' });
        }
        namespace.to(match.roomName).emit('game:message', { type: 'player_hit', targetId, health: target.health, ownerId, point: match.players[ownerId].point });
      }
    });

    socket.on('disconnect', () => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (match) removePlayer(playerId, match);
    });
  });

  // --- HELPER: Remove Player Cleanly ---
  function removePlayer(pid, match) {
    const player = match.players[pid];
    if (player) player.socket.leave(match.roomName);

    delete match.players[pid];
    playerToMatch.delete(pid);

    if (Object.keys(match.players).length === 0) {
      clearInterval(match.interval);
      matches.delete(match.id);
    }
  }

  function gameLoop(match) {
    const state = {
      players: Object.values(match.players).map(p => ({
        id: p.id, name: p.name, x: p.x, y: p.y || 0, z: p.z, angle: p.angle, health: p.health, point: p.point, isReady: p.isReady
      }))
    };
    namespace.to(match.roomName).emit('game:message', { type: 'tick', state });
  }
}
export default initializeAlpacaRoadNamespace;
