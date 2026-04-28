// client/GameClient.js
import { io } from 'socket.io-client';
import { gMinigame } from '../core/globals';
export class GameClient {
  constructor() {
    this.socket = null;
    this.serverObstacles = [];
  }

  connect() {
    if (this.socket) return;

    // FIX: Just use the namespace. Socket.io will automatically figure out 
    // to use https://localhost:8443 based on your browser URL!
    this.socket = io('/alpaca-road', { transports: ['websocket'], withCredentials: true });

    // --- CLIENT TRIPWIRES ---
    this.socket.on('connect', () => {
      console.log("✅ FRONTEND: Connected to Server successfully! ID:", this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error("❌ FRONTEND: Socket Connection FAILED!", err.message);
    });
    // ------------------------

    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.serverObstacles = [];
      console.log("🔌 Disconnected from server and wiped local data.");
    }
  }

  createRoom(playerName) {
    if (this.socket) {
      console.log("Game Client:", playerName)
      this.socket.emit('create_room', { name: playerName });
    }
  }

  joinRoom(playerName, roomId) {
    if (this.socket) this.socket.emit('join_room', { name: playerName, roomId: roomId });
  }

  sendReady(isReadyStatus) {
    if (this.socket) this.socket.emit('ready_toggle', { isReady: isReadyStatus });
  }

  setupListeners() {
    this.socket.on('available_rooms', (roomList) => {
      console.log("Game Client available rooms:", roomList)
      gMinigame.value.publicRooms = roomList;
    });

    this.socket.on('join_success', (data) => {
      console.log("GC: joined succesfully");
      gMinigame.value.currentRoomName = data.roomName;
    });

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
}

export const activeClient = new GameClient();