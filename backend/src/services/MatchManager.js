import { AlpacaRoadMatch } from "./AlpacaRoadMatch.js";
import { SpitRoyalMatch } from "./SpitRoyaleMatch.js";

const GAME_REGISTRY = {
  2: SpitRoyalMatch,
  4: AlpacaRoadMatch,
};

export class MatchManager {
  constructor(ioNamespace) {
    this.io = ioNamespace;
    this.matches = new Map();
    this.playerToMatch = new Map();

    this.setupListeners();
  }

  broadcastPublicRooms() {
    const publicRooms = [];
    for (const match of this.matches.values()) {
      const typeStr = Object.keys(GAME_REGISTRY).find(key => GAME_REGISTRY[key] === match.constructor);
      const currentType = Number(typeStr);

      if ((match.status === 'LOBBY' && match.players.size > 0 && match.players.size < 4 && currentType === 4) ||
        (match.status === 'PLAYING' && match.players.size > 0 && match.players.size < 10 && currentType === 2)) {
        publicRooms.push({
          id: match.matchId,
          name: match.roomName,
          playerCount: match.players.size,
          gameType: currentType
        });
      }
    }
    this.io.emit('available_rooms', publicRooms);
  }

  setupListeners() {
    this.io.on('connection', (socket) => {
      this.broadcastPublicRooms();

      const leaveCurrentRoom = () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match) {
            match.removePlayer(socket.id);
            if (match.players.size === 0) {
              match.stop();
              this.matches.delete(matchId);
            }
          }
          this.playerToMatch.delete(socket.id);
        }
      };

      socket.on('create_room', ({ name, color, gameType }) => {
        console.log(`BACKEND: Received create_room request from ${name}`);

        leaveCurrentRoom();

        const roomId = Math.random().toString(36);
        const roomName = `${name}'s Room`;
        const MatchClass = GAME_REGISTRY[gameType];
        const match = new MatchClass(roomId, this.io, roomName, () => {
          this.broadcastPublicRooms();
        });

        this.matches.set(roomId, match);
        this.playerToMatch.set(socket.id, roomId);
        socket.emit('join_success', { roomId: roomId, roomName: roomName, gameType: gameType });
        match.addPlayer(socket, name, color);
        this.broadcastPublicRooms();
      });

      socket.on('join_room', ({ name, roomId, color }) => {
        const match = this.matches.get(roomId);
        const typeStr = Object.keys(GAME_REGISTRY).find(key => GAME_REGISTRY[key] === match.constructor);
        const currentType = Number(typeStr);

        if (match && ((match.status === 'LOBBY' && match.players.size < 4 && currentType === 4) ||
          (match.status === 'PLAYING' && match.players.size < 10 && currentType === 2))) {
          leaveCurrentRoom();
          this.playerToMatch.set(socket.id, roomId);
          socket.emit('join_success', { roomId: roomId, roomName: match.roomName, gameType: currentType });
          match.addPlayer(socket, name, color);
          this.broadcastPublicRooms();
        }
      });

      socket.on('leave_room', () => {
        leaveCurrentRoom();
        this.broadcastPublicRooms();
      })

      socket.on('ready_toggle', ({ isReady }) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) this.matches.get(matchId).toggleReady(socket.id, isReady);
      });

      socket.on('player_hit', () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handlePlayerHit === 'function') {
            match.handlePlayerHit(socket.id);
          }
        }
      });

      socket.on('player_hit_complete', () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handlePlayerHitComplete === 'function') {
            match.handlePlayerHitComplete(socket.id);
          }
        }
      })

      socket.on('player_spit', (data) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handlePlayerSpit === 'function') {
            match.handlePlayerSpit(socket.id, data.direction);
          }
        }
      });

      socket.on('player_input', (data) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handlePlayerInput === 'function') {
            match.handlePlayerInput(socket.id, data);
          }
        }
      });

      socket.on('spit_hit', ({ targetId }) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handleSpitHit === 'function') {
            match.handleSpitHit(socket.id, targetId);
          }
        }
      });

      socket.on('player_jump', () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handlePlayerJump === 'function') {
            match.handlePlayerJump(socket.id);
          }
        }
      });

      socket.on('player_active', () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match && typeof match.handleActive === 'function') {
            match.handleActive(socket.id);
          }
        }
      })

      socket.on('disconnect', () => {
        console.log('BACKEND: Receive disconnect request');
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          if (match) {
            match.removePlayer(socket.id);
            this.playerToMatch.delete(socket.id);
            if (match.players.size <= 0) {
              match.stop();
              this.matches.delete(matchId);
            }
          }
          this.playerToMatch.delete(socket.id);
          this.broadcastPublicRooms();
        }
      });
    });
  }
}