import { AlpacaRoadMatch } from "./AlpacaRoadMatch.js";

export class MatchManager {
  constructor(ioNamespace) {
    this.io = ioNamespace;
    this.matches = new Map();
    this.playerToMatch = new Map();

    this.setupListeners();
  }

  // This sends the menu to everyone
  broadcastPublicRooms() {
    const publicRooms = [];

    for (const match of this.matches.values()) {
      // Only show rooms that haven't started and aren't full
      if (match.status === 'LOBBY' && match.players.size < 4) {
        publicRooms.push({
          id: match.matchId,         // Hidden internal ID
          name: match.roomName,      // "Alex's Room"
          playerCount: match.players.size
        });
      }
    }

    // Broadcast to EVERYONE connected to the namespace
    this.io.emit('available_rooms', publicRooms);
  }

  setupListeners() {
    this.io.on('connection', (socket) => {

      console.log("🔥 BACKEND: A player walked into the MatchManager! ID:", socket.id);

      // Send the list to the new player immediately
      this.broadcastPublicRooms();

      socket.on('create_room', ({ name }) => {
        console.log(`🔥 BACKEND: Received create_room request from ${name}`);

        const roomId = Math.random().toString(36); // Hidden ID
        const roomName = `${name}'s Room`; // Display Name

        // Pass a callback so the Match can tell us when it starts playing
        const match = new AlpacaRoadMatch(roomId, this.io, roomName, () => {
          this.broadcastPublicRooms();
        });

        this.matches.set(roomId, match);
        match.addPlayer(socket, name);
        this.playerToMatch.set(socket.id, roomId);

        // Tell the creator they successfully joined their own room
        console.log("MM: join_success");
        socket.emit('join_success', { roomId: roomId, roomName: roomName });

        // Update the public menu for everyone else!
        this.broadcastPublicRooms();
      });

      socket.on('join_room', ({ name, roomId }) => {
        console.log("MM: join_room");
        const match = this.matches.get(roomId);

        if (match && match.status === 'LOBBY' && match.players.size < 4) {
          match.addPlayer(socket, name);
          this.playerToMatch.set(socket.id, roomId);

          console.log("MM: join_success");
          socket.emit('join_success', { roomId: roomId, roomName: match.roomName });

          // Update the public menu (e.g., changes from 1/4 to 2/4 players)
          this.broadcastPublicRooms();
        }
      });

      socket.on('ready_toggle', ({ isReady }) => {
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) this.matches.get(matchId).toggleReady(socket.id, isReady);
      });

      socket.on('disconnect', () => {
        console.log(`🔥 BACKEND: Receive disconnect request`);
        const matchId = this.playerToMatch.get(socket.id);
        if (matchId) {
          const match = this.matches.get(matchId);
          match.removePlayer(socket.id);
          this.playerToMatch.delete(socket.id);

          if (match.players.size === 0) {
            match.stop();
            this.matches.delete(matchId);
          }
          // Update the public menu because someone left!
          this.broadcastPublicRooms();
        }
      });
    });
  }
}