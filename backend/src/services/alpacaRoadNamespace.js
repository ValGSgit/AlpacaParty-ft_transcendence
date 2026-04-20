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
    
      let matchToJoin;
    
      // 1. Determine which room to join or create
      if (roomId && roomId !== -1) {
        // Try to find the specific requested room
        matchToJoin = Array.from(matches.values()).find(m => m.id === roomId);
        if (!matchToJoin) {
          console.log(`Room ${roomId} not found.`);
          return; // You might want to emit an error to the client here
        }
      } else {
        // Find an open match, or null if all are full
        matchToJoin = Array.from(matches.values()).find(m => Object.keys(m.players).length < MAX_PLAYERS);
      }
    
      // 2. Create a new room if needed
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
        console.log("New roomId", matchId);
      }
    
      // 3. DEFINE THE HOST: If the room is currently empty, this player is the Host
      const currentPlayersCount = Object.keys(matchToJoin.players).length;
      const isHost = currentPlayersCount === 0;
    
      const spawn = getValidSpawn(matchToJoin.players);
    
      // 4. Create the player object
      const newPlayer = {
        id: playerId,
        matchId: matchToJoin.id,
        socket,
        name: name || socket.user?.username || 'Vue_Llama',
        x: spawn.x, y: 0, z: spawn.z, angle: spawn.angle,
        health: MAX_HEALTH,
        alive: true,
        point: 0,
        isReady: false,
        isHost: isHost // Save host status on the server-side state
      };
    
      matchToJoin.players[playerId] = newPlayer;
      playerToMatch.set(playerId, matchToJoin.id);
      socket.join(matchToJoin.roomName);
    
      // 5. Send the joined message back to the client, including the isHost flag
      socket.emit('game:message', {
        type: 'joined',
        playerId,
        matchId: matchToJoin.id,
        isHost: isHost,
        spawn: { x: spawn.x, z: spawn.z, angle: spawn.angle }
      });
    });

    socket.on('spawnObstacle', (config) => {
      // Find which match this player is in
      const matchId = playerToMatch.get(playerId);
      if (!matchId) return;
    
      const match = matches.get(matchId);
      if (!match) return;
      console.log(config)
      // Broadcast the obstacle to everyone ELSE in the room
      // We wrap it in 'game:message' so your GameClient can catch it
      socket.broadcast.to(match.roomName).emit('game:message', {
        type: 'spawnObstacle',
        config: config
      });
      console.log(match.roomName)
    });

    socket.on('levelUp', (data) => {
      const matchId = playerToMatch.get(playerId);
      if (!matchId) return;
    
      const match = matches.get(matchId);
      if (!match) return;
    
      // Broadcast the new level stats to everyone ELSE in the room
      socket.to(match.roomName).emit('game:message', {
        type: 'levelUp',
        data: data
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

    socket.on('point', ({ ownerId }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

      if (match.players[ownerId])
          match.players[ownerId].point++
        namespace.to(match.roomName).emit('game:message', { type: 'get_point', ownerId, point: match.players[ownerId].point });
    });

    socket.on('hit', ({ targetId }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

      const target = match.players[targetId];
      if (target && target.alive) {
        target.health -= 1;
        
        if (target.health <= 0) {
          target.alive = false;
          target.socket.emit('game:message', { type: 'game_over', reason: 'eliminated' });
        }
        namespace.to(match.roomName).emit('game:message', { type: 'get_hit', targetId, health: target.health});
      }
    });

    socket.on('disconnect', () => {
      // Find which match the disconnected player was in
      const matchId = playerToMatch.get(playerId); 
      if (!matchId) return;
    
      const match = matches.get(matchId);
      if (!match) return;
    
      const disconnectedPlayer = match.players[playerId];
      if (!disconnectedPlayer) return;
    
      // 1. Remove the player from the room state
      delete match.players[playerId];
      playerToMatch.delete(playerId);
    
      const remainingPlayerIds = Object.keys(match.players);
    
      // 2. Check if the room is now empty
      if (remainingPlayerIds.length === 0) {
        // Cleanup the room to prevent memory leaks
        clearInterval(match.interval);
        matches.delete(matchId);
        console.log(`Room ${matchId} destroyed.`);
        return;
      } 
    
      // 3. HOST MIGRATION LOGIC
      if (disconnectedPlayer.isHost) {
        // Pick the first available remaining player to be the new host
        const newHostId = remainingPlayerIds[0];
        const newHostPlayer = match.players[newHostId];
    
        // Update their status on the server
        newHostPlayer.isHost = true;
    
        // Send a direct message to the new host's socket using the reference we saved
        // We wrap it in 'game:message' so your GameClient handles it
        newHostPlayer.socket.emit('game:message', {
          type: 'host_migrated'
        });
    
        console.log(`Host left. Migrated host role to ${newHostPlayer.name} (${newHostId})`);
      }
    
      // 4. Let everyone else know a player left (so you can remove their alpaca)
      socket.to(match.roomName).emit('game:message', {
        type: 'player_left',
        playerId: playerId
      });
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
