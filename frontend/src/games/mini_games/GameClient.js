// client/GameClient.js
import { io } from 'socket.io-client';
import { gMinigame } from '../core/globals';
import { changeGame } from './init';
export class GameClient {
  constructor() {
    this.socket = null;
    this.serverObstacles = [];
  }

  connect() {
    if (this.socket) return;

    this.socket = io('/alpaca-road', { transports: ['websocket'], withCredentials: true });

    this.socket.on('connect', () => {
      console.log("✅ FRONTEND: Connected to Server successfully! ID:", this.socket.id);
    });
    this.socket.on('connect_error', (err) => {
      console.error("❌ FRONTEND: Socket Connection FAILED!", err.message);
    });

    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.serverObstacles = [];
      console.log("Disconnected from server and wiped local data.");
    }
  }

  createRoom(playerName) {
    if (this.socket) {
      console.log("GC create_room:", playerName)
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
      console.log("GC: join_success");
      gMinigame.value.currentRoomName = data.roomName;
      console.log(gMinigame.value.currentRoomName);
    });

    this.socket.on('lobby_update', (playerList) => {
      console.log("GC: lobby_update");
      gMinigame.value.players = playerList;
    });

    this.socket.on('game_start', () => {
      console.log("GC: game_start");
      gMinigame.value.isActive = true;

      // 2. Now transition the UI and build the 3D scene
      changeGame(gMinigame.value.mode, 1);
    });

    this.socket.on('tick', (snapshot) => {
      this.serverObstacles = snapshot.obstacles;
      gMinigame.value.players = snapshot.players;
    });
  }
}

export const activeClient = new GameClient();
