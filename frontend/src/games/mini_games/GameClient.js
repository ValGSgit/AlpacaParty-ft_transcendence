import { io } from 'socket.io-client';
import { alpacaHandling } from '../components/alpacaHandling.js';
import { useFloatingText } from '../components/floatingText.js';
import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
import { gCollidables, gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { removeFromArray, removeObject } from '../core/removeObjects.js';
import { activePlayers, applyLevelUp, createObstacle, initInitalPlayerCount, initObstacles } from './alpacaRoad.js';
import { makeAnnouncement } from './annoucement.js';
import { remotePlayers } from './client.js';

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
    this.matchId = null;

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
        gUI.countDown = true;
        makeAnnouncement('Get Ready!', 1000);
        await sleep(1000);
        makeAnnouncement('3', 1000);
        await sleep(1000);
        makeAnnouncement('2', 1000);
        await sleep(1000);
        makeAnnouncement('1', 1000);
        await sleep(1000);
        makeAnnouncement('Start!', 1000);
        gUI.countDown = false;

        gMinigame.value.isActive = true;
      }
      let i = 1 // playerCount
      for (const id in remotePlayers) {
        activePlayers.push(remotePlayers[id]) // push other players
        i++
      }
      initInitalPlayerCount(i);
      if (activeClient.isHost)
        initObstacles();
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
        console.log("msg.matchId = ", msg.matchId)
        this.matchId = msg.matchId;
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


export function setupCallbacks(client) {
  // --- GAME-SPECIFIC EVENTS (player_spit, player_hit) ---
  client.onGameEvent = (msg) => {
    if (msg.type === 'player_spit') {
      if (remotePlayers[msg.playerId]) {
        const { makeSpit } = alpacaHandling();
        makeSpit(remotePlayers[msg.playerId]);
      }
    }

    if (msg.type === 'player_hit') {
      let localPlayerId = activeClient.localPlayerId
      if (msg.targetId === localPlayerId) {
        gUser.value.hp = msg.health;
        gPlayer.value.hp = msg.health;
        gPlayer.value.isDead = -1
        gMinigame.value.players[0].hp--
        if (gUser.value.hp === 0) {
          gPlayer.value.isDead = 1
          gMinigame.value.isActive = false
          gMinigame.value.isGameOver = true;
        }
        spawnFloatingText(gPlayer.value.model, '-💔', 'hearts');
      }
      else {
        if (msg.ownerId === localPlayerId) {
          gUser.value.point = msg.point
          gPlayer.value.point = msg.point
        }
        remotePlayers[msg.targetId].isDead = -1
        spawnFloatingText(remotePlayers[msg.targetId].model, '-💔', 'hearts');
      }
    }

    if (msg.type === 'spawnObstacle') {
      createObstacle(msg.config);
    }
    else if (msg.type === 'levelUp') {
      // Guests receive the new stats and apply them instantly
      applyLevelUp(msg.data.level, msg.data.roadSpeed, msg.data.timerMultiplier);
    }
  };

  // --- GAME OVER ---
  client.onGameOver = (msg) => {
    gPlayer.value.isDead = 1;
    gUser.value.isPlaying = false;
  };

  // --- STATE UPDATES (remote player positions) ---
  client.onStateUpdate = (state) => {
    const serverPlayerIds = new Set(state.players.map(p => p.id));

    for (const p of state.players) {
      if (p.id === activeClient.localPlayerId) continue; // Skip ourselves

      // --- REMOTE PLAYERS ---
      if (!remotePlayers[p.id]) {
        remotePlayers[p.id] = "loading";

        createAlpaca().then((newAlpaca) => {
          const model = newAlpaca.model;

          // TAG IT FOR THE RAYCASTER
          model.userData.networkId = p.id;

          gScene.value.add(model);
          newAlpaca.name = p.name
          remotePlayers[p.id] = newAlpaca;
          gMinigame.value.players.push({ id: p.id, name: newAlpaca.name, hp: CONST.HP, point: 0 });
        });

      } else if (remotePlayers[p.id] !== "loading" && remotePlayers[p.id].isDead !== 1) {
        if (remotePlayers[p.id].model.position.x !== p.x || remotePlayers[p.id].model.position.z !== p.z || remotePlayers[p.id].model.rotation.y !== p.angle)
          remotePlayers[p.id].isMoving = true
        else
          remotePlayers[p.id].isMoving = false
        if (remotePlayers[p.id].model.position.y > 0)
          remotePlayers[p.id].isJumping = true
        else
          remotePlayers[p.id].isJumping = false
        remotePlayers[p.id].model.position.set(p.x, p.y || 0, p.z);
        remotePlayers[p.id].point = p.point
        remotePlayers[p.id].hp = p.health
        if (remotePlayers[p.id].hp === 0) {
          remotePlayers[p.id].isDead = 1
          removeFromArray(remotePlayers[p.id].model, gCollidables)
        }
        if (p.angle !== undefined) remotePlayers[p.id].model.rotation.y = p.angle;
        const index = gMinigame.value.players.findIndex(player => player.id === p.id);
        if (index !== -1) {
          gMinigame.value.players[index].hp = p.health // update hp to see if alpaca isDead
          gMinigame.value.players[index].point = p.point
        }
      }
    }
    cleanUpDisconnectedPlayers(serverPlayerIds)
  };

  // --- JOINED: snap to spawn, start sending inputs ---
  client.onJoined = (playerId, spawn) => {
    console.log("Joined multiplayer as:", playerId);
    gMinigame.value.players.push({ id: playerId, name: gUser.value.name, hp: CONST.HP, point: 0 });
    if (spawn) {
      gPlayer.value.model.position.set(spawn.x, 0, spawn.z);
      gPlayer.value.model.rotation.y = spawn.angle;
    }

    client.getInput = () => {
      return {
        x: gPlayer.value?.model.position.x || 0,
        y: gPlayer.value?.model.position.y || 0,
        z: gPlayer.value?.model.position.z || 0,
        angle: gPlayer.value?.model.rotation.y || 0
      };
    };
  };
}


export function cleanUpDisconnectedPlayers(serverPlayerIds) {
  for (const id in remotePlayers) {
    if (!serverPlayerIds.has(id)) {

      const modelToRemove = remotePlayers[id].model;
      if (modelToRemove !== "loading" && modelToRemove) {
        gScene.value.remove(modelToRemove);
        removeObject(remotePlayers[id]);
        modelToRemove.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }
      const index = gMinigame.value.players.findIndex(player => player.id === id);
      if (index !== -1)
        gMinigame.value.players.splice(index, 1);
      delete remotePlayers[id];
    }
  }
}
