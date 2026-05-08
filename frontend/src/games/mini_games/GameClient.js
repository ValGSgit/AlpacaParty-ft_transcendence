// import { io } from 'socket.io-client';
// import { gMinigame, gUI } from '../core/globals';
// import { makeAnnouncement, playCountDown } from './annoucement';
// import { changeGame } from './init';

// export class GameClient {
//   constructor() {
//     this.socket = null;
//     this.serverData = {};
//   }

//   connect() {
//     if (this.socket) return;

//     this.socket = io('/alpaca-road', { transports: ['websocket'], withCredentials: true });
//     this.socket.on('connect', () => { console.log("✅ FRONTEND: Connected to Server successfully! ID:", this.socket.id); });
//     this.socket.on('connect_error', (err) => { console.error("❌ FRONTEND: Socket Connection FAILED!", err.message); });
//     this.setupListeners();
//   }

//   disconnect() {
//     if (this.socket) {
//       this.socket.disconnect();
//       this.socket = null;
//       this.serverObstacles = [];
//       console.log("Disconnected from server and wiped local data.");
//     }
//   }

//   createRoom(playerName, color, gameType) {
//     if (this.socket) {
//       this.socket.emit('create_room', { name: playerName, color: color, gameType: gameType });
//     }
//   }

//   joinRoom(playerName, roomId, color) {
//     if (this.socket) this.socket.emit('join_room', { name: playerName, roomId: roomId, color: color });
//   }

//   sendReady(isReadyStatus) {
//     if (this.socket) this.socket.emit('ready_toggle', { isReady: isReadyStatus });
//   }

//   sendHit() {
//     if (this.socket) {
//       this.socket.emit('player_hit');
//     }
//   }

//   sendHitComplete() {
//     if (this.socket) {
//       this.socket.emit('player_hit_complete');
//     }
//   }

//   sendJump() {
//     if (this.socket) {
//       this.socket.emit('player_jump');
//     }
//   }

//   sendSpit(direction) {
//     if (this.socket) {
//       this.socket.emit('player_spit', { direction: direction });
//     }
//   }

//   sendSpitHit(targetId) {
//     if (this.socket) {
//       this.socket.emit('spit_hit', { targetId: targetId });
//     }
//   }

//   sendActive() {
//     if (this.socket) {
//       this.socket.emit('player_active');
//     }
//   }

//   sendPlayerInput(x, y, z, angle) {
//     if (this.socket) {
//       this.socket.emit('player_input', { x, y, z, angle });
//     }
//   }

//   setupListeners() {
//     this.socket.on('available_rooms', (roomList) => {
//       gMinigame.value.publicRooms = roomList;
//     });

//     this.socket.on('join_success', (data) => {
//       this.serverData = {};
//       let mode = data.gameType;
//       gMinigame.value.mode = mode;

//       changeGame(mode, 1);
//       gUI.lobbyMenu = mode === 4;
//       gMinigame.value.currentRoomName = data.roomName;
//     });

//     this.socket.on('lobby_update', (playerList) => {
//       gMinigame.value.players = playerList;
//     });

//     this.socket.on('game_start', (data) => {
//       gUI.lobbyMenu = false;
//       gMinigame.value.isActive = true;
//       if (data && data.instant) {
//         console.log("GC: Instant Start! Bypassing countdown.")
//       } else {
//         playCountDown(3);
//       }
//     });

//     this.socket.on('level_up', (data) => {
//       makeAnnouncement(`LEVEL ${data.level}`, 2000);
//     })

//     this.socket.on('tick', (data) => {
//       gMinigame.value.players = data.players;
//       this.serverData = data;
//     });

//     this.socket.on('game_over', () => {
//       gMinigame.value.isGameOver = true;
//     });

//   }
// }

// export const activeClient = new GameClient();

import { io } from 'socket.io-client';
import { gMinigame, gUI } from '../core/globals';
import { makeAnnouncement, playCountDown } from './annoucement';
import { changeGame } from './init';

export class GameClient {
  constructor() {
    this.socket = null;
    // Generic rehydration pipe for any minigame
    this.serverData = {
      obstacles: [],
      players: [],
      roadSpeed: 0,
      spitEvents: [] // <-- NEW: Tracks incoming enemy projectiles
    };
  }

  connect() {
    if (this.socket) return;

    this.socket = io('/alpaca-road', { transports: ['websocket'], withCredentials: true });
    this.socket.on('connect', () => { console.log("✅ FRONTEND: Connected! ID:", this.socket.id); });
    this.socket.on('connect_error', (err) => { console.error("❌ FRONTEND: Connection FAILED!", err.message); });
    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.serverData = { obstacles: [], players: [], roadSpeed: 0, spitEvents: [] };
    }
  }

  createRoom(playerName, color, gameType) {
    if (this.socket) this.socket.emit('create_room', { name: playerName, color: color, gameType: gameType });
  }

  joinRoom(playerName, roomId, color) {
    if (this.socket) this.socket.emit('join_room', { name: playerName, roomId: roomId, color: color });
  }

  sendReady(isReadyStatus) {
    if (this.socket) this.socket.emit('ready_toggle', { isReady: isReadyStatus });
  }

  sendHit() {
    if (this.socket) this.socket.emit('player_hit');
  }

  sendHitComplete() {
    if (this.socket) this.socket.emit('player_hit_complete');
  }

  sendJump() {
    if (this.socket) this.socket.emit('player_jump');
  }

  sendActive() {
    if (this.socket) this.socket.emit('player_active');
  }

  // ---> NEW: Spit Royale Methods <---
  sendPlayerInput(x, y, z, angle) {
    if (this.socket) {
      this.socket.emit('player_input', { x, y, z, angle });
    }
  }

  sendSpit(direction) {
    if (this.socket) {
      this.socket.emit('player_spit', { direction: direction });
    }
  }

  sendSpitHit(targetId) {
    if (this.socket) {
      this.socket.emit('spit_hit', { targetId: targetId });
    }
  }

  setupListeners() {
    this.socket.on('available_rooms', (roomList) => {
      gMinigame.value.publicRooms = roomList;
    });

    this.socket.on('join_success', (data) => {
      this.serverData = { obstacles: [], players: [], roadSpeed: 0, spitEvents: [] };
      let mode = data.gameType;
      gMinigame.value.mode = mode;

      changeGame(mode, 1);
      gMinigame.value.currentRoomName = data.roomName;

      gUI.lobbyMenu = mode === 4;
    });

    this.socket.on('lobby_update', (playerList) => {
      gMinigame.value.players = playerList;
    });

    this.socket.on('game_start', (data) => {
      gUI.lobbyMenu = false;
      gMinigame.value.isActive = true;

      if (data && data.instant) {
        console.log("GC: Instant Start! Bypassing countdown.");
        // If the server sends a spawn point, teleport our local player immediately!
        if (data.spawn && typeof window.setLocalPlayerSpawn === 'function') {
          window.setLocalPlayerSpawn(data.spawn);
        }
      } else {
        playCountDown(3);
      }
    });

    this.socket.on('level_up', (data) => {
      makeAnnouncement(`LEVEL ${data.level}`, 2000);
    });

    this.socket.on('tick', (data) => {
      gMinigame.value.players = data.players;
      this.serverData.players = data.players;
      this.serverData.obstacles = data.obstacles || [];
      this.serverData.roadSpeed = data.roadSpeed || 0;
    });

    // ---> NEW: Catch enemy spits and queue them for the 3D engine <---
    this.socket.on('player_spit', (data) => {
      this.serverData.spitEvents.push(data);
    });

    this.socket.on('game_over', (data) => {
      gMinigame.value.isGameOver = true;
      if (data && data.reason === 'eliminated') {
        makeAnnouncement('Eliminated!', 3000);
      }
    });

    this.socket.on('match_over', (data) => {
      gMinigame.value.isGameOver = true;
      const msg = data.winnerId === this.socket.id ? 'You Won!' : `${data.winnerName || 'Someone'} Won!`;
      makeAnnouncement(msg, 5000);
    });
  }
}

export const activeClient = new GameClient();