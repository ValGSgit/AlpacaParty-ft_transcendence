export class BaseMatch {
  constructor(matchId, namespace, roomName, onStateChange) {
    this.matchId = matchId;
    this.namespace = namespace;
    this.roomName = roomName;
    this.onStateChange = onStateChange;

    this.players = new Map(); // Socket to player
    this.status = 'LOBBY';
    this.heartbeat = null;
  }

  // Add a player when they join
  addPlayer(socket, name, color) {
    const player = {
      id: socket.id,
      name: name || 'Vue_Alpaca',
      isReady: false,
      hp: 3,
      points: 0,
      color: color || "0x000000"
    };

    this.players.set(socket.id, player);
    socket.join(this.matchId); // Put their socket in this specific room
    this.syncLobby();          // Tell everyone the player list changed
  }

  // Remove a player when they disconnect
  removePlayer(socketId) {
    this.players.delete(socketId);
    this.syncLobby();
  }

  // Flip the ready switch
  toggleReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = isReady;
      this.syncLobby();
      this.checkStart(); // Check if we should start the game
    }
  }

  // Send the updated player list to everyone in the room
  syncLobby() {
    const playerList = Array.from(this.players.values());
    this.broadcast('lobby_update', playerList);
  }

  // Check if everyone is ready
  checkStart() {
    const playerList = Array.from(this.players.values());
    const allReady = playerList.length > 0 && playerList.every(p => p.isReady);

    if (allReady && this.status === 'LOBBY') {
      this.start();
      //if (this.onStateChange) this.onStateChange();
    }
  }

  // A helper tool to shout to the whole room
  broadcast(eventName, data) {
    this.namespace.to(this.matchId).emit(eventName, data);
  }

  // These will be customized by the specific game
  start() { }
  update() { }
  stop() {
    clearInterval(this.heartbeat);
    this.status = 'FINISHED';
  }
}