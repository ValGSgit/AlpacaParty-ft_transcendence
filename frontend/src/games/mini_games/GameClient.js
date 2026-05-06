import { io } from 'socket.io-client';
import { gMinigame, gUI } from '../core/globals';
import { makeAnnouncement, playCountDown } from './annoucement';
import { changeGame } from './init';

export class GameClient {
  constructor() {
    this.socket = null;
    this.serverObstacles = [];
    this.roadSpeed = 0;
  }

  connect() {
    if (this.socket) return;

    this.socket = io('/alpaca-road', { transports: ['websocket'], withCredentials: true });
    this.socket.on('connect', () => { console.log("✅ FRONTEND: Connected to Server successfully! ID:", this.socket.id); });
    this.socket.on('connect_error', (err) => { console.error("❌ FRONTEND: Socket Connection FAILED!", err.message); });
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

  createRoom(playerName, color) {
    if (this.socket) {
      this.socket.emit('create_room', { name: playerName, color: color });
    }
  }

  joinRoom(playerName, roomId, color) {
    if (this.socket) this.socket.emit('join_room', { name: playerName, roomId: roomId, color: color });
  }

  sendReady(isReadyStatus) {
    if (this.socket) this.socket.emit('ready_toggle', { isReady: isReadyStatus });
  }

  sendHit() {
    if (this.socket) {
      this.socket.emit('player_hit');
    }
  }

  sendHitComplete() {
    if (this.socket) {
      this.socket.emit('player_hit_complete');
    }
  }

  sendJump() {
    if (this.socket) {
      this.socket.emit('player_jump');
    }
  }

  setupListeners() {
    this.socket.on('available_rooms', (roomList) => {
      gMinigame.value.publicRooms = roomList;
    });

    this.socket.on('join_success', (data) => {
      this.serverObstacles = [];
      changeGame(gMinigame.value.mode, 1);
      gUI.lobbyMenu = true;
      gMinigame.value.currentRoomName = data.roomName;
    });

    this.socket.on('lobby_update', (playerList) => {
      gMinigame.value.players = playerList;
    });

    this.socket.on('game_start', () => {
      gUI.lobbyMenu = false;
      gMinigame.value.isActive = true;
      playCountDown(3);
    });

    this.socket.on('level_up', (data) => {
      makeAnnouncement(`LEVEL ${data.level}`, 2000);
    })

    this.socket.on('tick', (snapshot) => {
      this.serverObstacles = snapshot.obstacles;
      gMinigame.value.players = snapshot.players;
      this.roadSpeed = snapshot.roadSpeed;
    });

    this.socket.on('game_over', () => {
      gMinigame.value.isGameOver = true;
    });

  }
}

export const activeClient = new GameClient();
