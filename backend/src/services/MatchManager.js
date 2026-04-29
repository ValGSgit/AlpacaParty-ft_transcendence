import { AlpacaRoadMatch } from "./AlpacaRoadMatch.js";

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
      if (match.status === 'LOBBY' && match.players.size < 4) {
        publicRooms.push({
          id: match.matchId,
          name: match.roomName,
          playerCount: match.players.size
        });
      }
    }
    this.io.emit('available_rooms', publicRooms);
  }

  setupListeners() {
    this.io.on('connection', (socket) => {
      this.broadcastPublicRooms();

      socket.on('create_room', ({ name, color }) => {
        console.log(`BACKEND: Received create_room request from ${name}`);

        const roomId = Math.random().toString(36);
        const roomName = `${name}'s Room`;
        const match = new AlpacaRoadMatch(roomId, this.io, roomName, () => {
          this.broadcastPublicRooms();
        });

        this.matches.set(roomId, match);
        match.addPlayer(socket, name, color);
        this.playerToMatch.set(socket.id, roomId);

        // Tell the creator they successfully joined their own room
        console.log("MM: join_success");
        socket.emit('join_success', { roomId: roomId, roomName: roomName });

        // Update the public menu for everyone else!
        this.broadcastPublicRooms();
      });

      socket.on('join_room', ({ name, roomId, color }) => {
        const match = this.matches.get(roomId);

        if (match && match.status === 'LOBBY' && match.players.size < 4) {
          match.addPlayer(socket, name, color);
          this.playerToMatch.set(socket.id, roomId);

          socket.emit('join_success', { roomId: roomId, roomName: match.roomName });

          // Update the public menu (e.g., changes from 1/4 to 2/4 players)
          this.broadcastPublicRooms();
        }
      });

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

      socket.on('player_jump', () => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);

          // Route it to the AlpacaRoadMatch logic
          if (match && typeof match.handlePlayerJump === 'function') {
            match.handlePlayerJump(socket.id);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('BACKEND: Receive disconnect request');
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          match.removePlayer(socket.id);
          this.playerToMatch.delete(socket.id);

          if (match.players.size === 0) {
            match.stop();
            this.matches.delete(matchId);
          }
          this.broadcastPublicRooms();
        }
      });
    });
  }
}