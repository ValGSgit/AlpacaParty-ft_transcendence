import { io } from 'socket.io-client';
import { gMinigame, gScene, gPlayer } from '../core/globals';
import { useFloatingText } from '../components/floatingText.js';
import { activePlayers } from './alpacaRoad.js'

/**
 * Active game client singleton — accessible from any module without window globals.
 * Used by alpacaHandling.js to send hit events to the server.
 */
let activeClient = null;
const { spawnFloatingText } = useFloatingText();

export function getActiveClient() {
  return activeClient;
}

/**
 * Base class for multiplayer game connections.
 * Handles: namespace connection, auth, join, input loop, state sync, cleanup.
 *
 * Subclass for game-specific convenience methods (e.g. SpitRoyaleClient.fireSpit).
 * Game-specific server events flow through the onGameEvent callback.
 */
export class GameClient {
  constructor(namespace, { tickRate = 33 } = {}) {
    this.socket = null;
    this.localPlayerId = null;
    this.inputInterval = null;
    this.namespace = namespace;
    this.tickRate = tickRate;
    this.isHost = false;

    // Callbacks for the game mode to hook into
    this.onJoined = null;
    this.onStateUpdate = null;
    this.onGameEvent = null;
    this.onGameOver = null;

    // Override this to provide current player input each tick
    this.getInput = () => ({});
  }

  check() {
    if (this.socket) this.destroy();

    const token = localStorage.getItem('accessToken');
    this.socket = io(this.namespace, {
      transports: ['websocket'],
      auth: { token },
    });
    this.socket.on('lobby:list', (matchToJoin) => {
      //console.log("matches: ", matchToJoin);
      gMinigame.value.lobby = matchToJoin
    });
    this.socket.emit('check-lobby');
  }

  connect(playerName, matchId) {
    if (this.socket) this.destroy();

    const token = localStorage.getItem('accessToken');
    this.socket = io(this.namespace, {
      transports: ['websocket'],
      auth: { token },
    });

    
    this.socket.on('connect', () => {
      console.log(`[GameClient] Connected to ${this.namespace}`);
      this.socket.emit('join', { name: playerName, roomId: matchId });
    });
    
    this.socket.on('game:message', (msg) => this.#handleMessage(msg));
    
    this.socket.on('game:start', (data) => {
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      async function startCountdown() {
/*         for (let i = 0; i < gMinigame.value.players.length - 1; i++) {
          if (gMinigame.value.players[i] !== gPlayer.value)
            activePlayers.push(gMinigame.value.players[i])
        } */
        spawnFloatingText(gScene.value.floor, 'Get Ready!');

        await sleep(1000);

        spawnFloatingText(gScene.value.floor, '3');
        await sleep(1000);
        
        spawnFloatingText(gScene.value.floor, '2');
        await sleep(1000);
        
        spawnFloatingText(gScene.value.floor, '1');
        await sleep(1000);
        
        spawnFloatingText(gScene.value.floor, 'Start!');
        gMinigame.value.isActive = true;
      }

      startCountdown();
    });

    this.socket.on('connect_error', (err) => {
      console.error(`[GameClient] ${this.namespace} error:`, err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[GameClient] Disconnected from ${this.namespace}:`, reason);
      this.#cleanupInterval();
    });

    activeClient = this;
  }

  #handleMessage(msg) {
    switch (msg.type) {
      case 'joined':
        this.localPlayerId = msg.playerId;
        this.isHost = msg.isHost || false;
        this.onJoined?.(this.localPlayerId, msg.spawn);
        this.#startInputLoop();
        break;
      case 'host_migrated':
        this.isHost = true;
        console.log("I am the new host!");
        break;
      case 'tick':
      case 'game_start':
        if (msg.state) this.onStateUpdate?.(msg.state);
        break;
      case 'game_over':
        this.onGameOver?.(msg);
        break;
      default:
        // Game-specific events (player_spit, player_hit, etc.)
        this.onGameEvent?.(msg);
        break;
    }
  }

  /** Send a game-specific event to the server. */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  #startInputLoop() {
    this.#cleanupInterval();
    this.inputInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('input', this.getInput());
      }
    }, this.tickRate);
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
      this.socket.off('game:message');
      this.socket.disconnect();
      this.socket = null;
    }
    this.localPlayerId = null;
    if (activeClient === this) activeClient = null;
  }
}
