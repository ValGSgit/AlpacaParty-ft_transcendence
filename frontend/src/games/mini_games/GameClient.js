import { io } from 'socket.io-client';
import { gMinigame, gUI } from '../core/globals';
import { makeAnnouncement, playCountDown } from './annoucement';
import { changeGame } from './init';

export class GameClient {
  constructor() {
    this.socket = null;
    this.serverData = {};
    this.spitQueue = [];
  }

  connect() {
    if (this.socket) return;

    this.socket = io('/minigames', { transports: ['websocket'], withCredentials: true });
    this.socket.on('connect', () => { debug("GameClient connected:", this.socket.id); });
    this.socket.on('connect_error', (err) => { devError("GameClient connection failed:", err.message); });
    // Drop the singleton reference on disconnect so a new connect() works
    // cleanly after a tab close / network drop / hot reload.
    this.socket.on('disconnect', () => {
      this.socket = null;
      this.serverData = {};
      this.spitQueue = [];
    });
    this.setupListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('leave_room');
      this.socket.disconnect();
      this.socket = null;
      this.serverData = {};
      this.spitQueue = [];
    }
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave_room');
      this.serverData = {};
      this.spitQueue = [];
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
      this.serverData = {};
      this.spitQueue = [];
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
        if (data.spawn) {
          gMinigame.value.spawnData = data.spawn;
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

    this.socket.on('player_spit', (data) => {
      this.spitQueue.push(data);
    });

    this.socket.on('game_over', (data) => {
      gMinigame.value.isGameOver = true;
      if (data) {
        if (data.reason === 'eliminated') makeAnnouncement('Eliminated!', 3000);
        if (data.reason === 'lastone_standing') {
          if (data.winnerId === this.socket.id) makeAnnouncement('You won!', 3000);
        }
      }
    });
  }
}

export const activeClient = new GameClient();