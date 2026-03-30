import AuthService from './authService.js';
import User from '../models/User.js';
//import { CONST } from '../../../frontend/src/games/config/constants.js';
//can't do that as they are two different dockers

const TICK_RATE = 33; 
const MAX_HEALTH = 3//CONST.HP;
const MAX_PLAYERS = 20;
const ARENA_RADIUS = 25//CONST.BASE_RADIUS;
const PLAYER_RADIUS = 2;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function initializeSpitRoyaleNamespace(io) {
  const namespace = io.of('/spit-royale');
  
  // Keep track of ongoing matches
  const matches = new Map();
  const playerToMatch = new Map();

  // --- HELPER: Random Non-Overlapping Spawn ---
  function getValidSpawn(players) {
    for (let attempts = 0; attempts < 50; attempts++) {
      // Pick random angle and distance from center
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (ARENA_RADIUS - 2); // -2 to stay away from the wall
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      
      // Check distance against all other players
      let isOverlapping = false;
      for (const p of Object.values(players)) {
        const dx = p.x - x;
        const dz = p.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < PLAYER_RADIUS * 2.5) { // 2.5 gives a nice buffer
          isOverlapping = true;
          break;
        }
      }
      
      if (!isOverlapping) {
        return { x, z, angle: -angle }; // Face towards the center roughly
      }
    }
    // Fallback if the arena is wildly crowded
    return { x: 0, z: 0, angle: 0 }; 
  }

  namespace.use(async (socket, next) => {
    // ... (Keep your auth middleware exactly the same) ...
    next(); 
  });

  namespace.on('connection', (socket) => {
    const playerId = `u${socket.user?.id || generateId()}`;

    // 1. JOINING THE ARENA
    socket.on('join', ({ name } = {}) => {
      if (playerToMatch.has(playerId)) return; 

      // Find a match that isn't full, or create a new one
      let matchToJoin = Array.from(matches.values()).find(m => Object.keys(m.players).length < MAX_PLAYERS);
      
      if (!matchToJoin) {
        const matchId = generateId();
        matchToJoin = {
          id: matchId,
          roomName: `spit-match:${matchId}`,
          state: 'playing',
          players: {},
          interval: setInterval(() => gameLoop(matchToJoin), TICK_RATE)
        };
        matches.set(matchId, matchToJoin);
      }

      // Generate a safe spawn point
      const spawn = getValidSpawn(matchToJoin.players);

      const newPlayer = {
        id: playerId,
        socket,
        name: name || socket.user?.username || 'Vue_Llama',
        x: spawn.x, y: 0, z: spawn.z, angle: spawn.angle,
        health: MAX_HEALTH,
        alive: true
      };

      matchToJoin.players[playerId] = newPlayer;
      playerToMatch.set(playerId, matchToJoin.id);
      socket.join(matchToJoin.roomName);

      socket.emit('spit:message', { 
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
      if (match) socket.broadcast.to(match.roomName).emit('spit:message', { type: 'player_spit', playerId });
    });

    socket.on('spit_hit', ({ targetId }) => {
      const matchId = playerToMatch.get(playerId);
      const match = matchId ? matches.get(matchId) : null;
      if (!match) return;

      const target = match.players[targetId];
      if (target && target.alive) {
        target.health -= 1; 
        namespace.to(match.roomName).emit('spit:message', { type: 'player_hit', targetId, health: target.health });

        if (target.health <= 0) {
          target.alive = false;
          // Kick just the dead player out, leave everyone else playing!
          target.socket.emit('spit:message', { type: 'game_over', winner: 'You were eliminated!' });
          removePlayer(target.id, match);
        }
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

    // If the room is empty, shut it down to save server memory
    if (Object.keys(match.players).length === 0) {
      clearInterval(match.interval);
      matches.delete(match.id);
    }
  }

  function gameLoop(match) {
    const state = {
      players: Object.values(match.players).map(p => ({
        id: p.id, name: p.name, x: p.x, y: p.y || 0, z: p.z, angle: p.angle, health: p.health
      }))
    };
    namespace.to(match.roomName).emit('spit:message', { type: 'tick', state });
  }
}
export default initializeSpitRoyaleNamespace;