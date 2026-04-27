// client/GameClient.js
import { io } from 'socket.io-client';
import { gMinigame } from '../core/globals';

export class GameClient {
  constructor() {
    this.socket = null;
    this.serverObstacles = [];
  }

  connect() {
    // Connect to the Global Hub
    this.socket = io('/alpaca-road', { transports: ['websocket'] });

    // 1. Listen for the Public Menu
    this.socket.on('available_rooms', (roomList) => {
      // Save this to a global ref so your Vue UI can loop through it
      gMinigame.value.publicRooms = roomList;
    });

    // 2. Listen for joining a room successfully
    this.socket.on('join_success', (data) => {
      gMinigame.value.currentRoomName = data.roomName; // Hide the menu, show the lobby
    });

    // 3. Standard Game Syncs
    this.socket.on('lobby_update', (playerList) => {
      gMinigame.value.players = playerList;
    });

    this.socket.on('game_start', () => {
      gMinigame.value.isActive = true;
    });

    this.socket.on('tick', (snapshot) => {
      this.serverObstacles = snapshot.obstacles;
      gMinigame.value.players = snapshot.players;
    });
  }

  // --- Actions ---
  createRoom(playerName) {
    this.socket.emit('create_room', { name: playerName });
  }

  joinRoom(playerName, hiddenRoomId) {
    this.socket.emit('join_room', { name: playerName, roomId: hiddenRoomId });
  }

  sendReady(isReadyStatus) {
    this.socket.emit('ready_toggle', { isReady: isReadyStatus });
  }
}

export const activeClient = new GameClient();