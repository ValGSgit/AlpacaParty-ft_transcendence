import { io } from 'socket.io-client';

export class SpitRoyaleClient {
  constructor() {
    this.socket = null;
    this.localPlayerId = null;
    this.inputInterval = null;

    // Callbacks for your Vue/Three.js frontend to hook into
    this.onJoined = null;
    this.onStateUpdate = null;
    
    // Provide a function to this property so the client can pull current inputs
    this.getInput = () => ({ vx: 0, vz: 0, angle: 0 }); 
  }

  connect(playerName) {
    const token = localStorage.getItem('accessToken');
    
    this.socket = io('/spit-royale', {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Connected to server!');
      this.socket.emit('join', { name: playerName });
    });

    this.socket.on('spit:message', (msg) => this.#handleMessage(msg));

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server.');
      this.#cleanupInterval();
    });
  }

  #handleMessage(msg) {
    switch (msg.type) {
      case 'joined':
        this.localPlayerId = msg.playerId;
        // Pass the spawn data to the callback!
        this.onJoined?.(this.localPlayerId, msg.spawn); 
        this.inputInterval = setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('input', this.getInput());
          }
        }, 33);
        break;

      case 'tick':
      case 'game_start':
        // Whenever the server sends a world update, pass it to your renderer
        if (msg.state) {
          this.onStateUpdate?.(msg.state);
        }
        break;
        
      // Add other cases (player_hit, game_over) later as you need them
    }
  }

  // Call this when the player presses the spit button
  fireSpit(angle) {
    if (this.socket?.connected) {
      this.socket.emit('spit', { angle });
    }
  }

  #cleanupInterval() {
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
  }

  destroy() {
    this.#cleanupInterval();
    if (this.socket) {
      this.socket.off('spit:message');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}