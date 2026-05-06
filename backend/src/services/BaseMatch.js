export class BaseMatch {
  constructor(matchId, namespace, roomName) {
    this.matchId = matchId;
    this.namespace = namespace;
    this.roomName = roomName;

    this.players = new Map();
    this.status = 'LOBBY';
    this.heartbeat = null;
  }

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
    socket.join(this.matchId);
    this.syncLobby();
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.syncLobby();
  }

  toggleReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = isReady;
      this.syncLobby();
      this.checkStart();
    }
  }

  syncLobby() {
    const playerList = Array.from(this.players.values());
    this.broadcast('lobby_update', playerList);
  }

  checkStart() {
    const playerList = Array.from(this.players.values());
    const allReady = playerList.length > 0 && playerList.every(p => p.isReady);

    if (allReady && this.status === 'LOBBY') {
      this.start();
    }
  }

  broadcast(eventName, data) {
    this.namespace.to(this.matchId).emit(eventName, data);
  }

  start() { }
  update() { }
  stop() {
    clearInterval(this.heartbeat);
    this.status = 'FINISHED';
  }
}