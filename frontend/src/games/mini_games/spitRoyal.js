import { alpacaHandling } from '../components/alpacaHandling.js';
import { createAlpaca } from '../core/createObjects.js';
import { gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { getValidRandomPos } from '../utils/spawnRandomly.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { SpitRoyaleClient } from './client.js';
import { changeFloorColor } from './utils.js';

let onlineClient = null;
const remotePlayers = {};
let originalSpitFn = null; // Store the original spit function to restore later


export async function initSpitRoyalAI(playerCount, tempAlpacas) {
  gMinigame.value.mode = 1
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
  for (let i = 0; i < playerCount - 1; i++) {
    let alpaca
    const data = await getValidRandomPos('/models/alpaca.glb', 1);
    if (tempAlpacas[i]) {
      alpaca = tempAlpacas[i]
      registerEntity(alpaca, 'alpaca')
      alpaca.model.position.set(data[0].position[0], data[0].position[1], data[0].position[2])
    }
    else
      alpaca = await createAlpaca(null, null, data[0].position, data[0].rotation, data[0].scale);
    gScene.value.add(alpaca.model)
  }
  gMinigame.value.isActive = true;
}

export async function initSpitRoyalOnline() {
  gMinigame.value.mode = 2;
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca');
  gScene.value.add(gPlayer.value.model);
  gUI.cameraMode = 1;

  onlineClient = new SpitRoyaleClient();
  const playerName = gUser.value?.name || 'Vue_Alpaca';
  onlineClient.connect(playerName);

  // --- HOOK LOCAL SPIT ---
  originalSpitFn = gPlayer.value.spit;
  gPlayer.value.spit = () => {
    originalSpitFn.call(gPlayer.value);
    if (onlineClient) onlineClient.fireSpit();
  };

  setupCallbacks(onlineClient);
  gMinigame.value.isActive = true;
}

export function cleanupClient() {
  // --- MULTIPLAYER CLEANUP ---
  if (onlineClient) {
    onlineClient.destroy();
    onlineClient = null;
  }
  // Restore original spit function if we overwrote it
  if (originalSpitFn) {
    gPlayer.value.spit = originalSpitFn;
    originalSpitFn = null;
  }
  for (const id in remotePlayers) {
    if (remotePlayers[id] !== "loading" && remotePlayers[id]) {
      gScene.value.remove(remotePlayers[id]);
    }
    delete remotePlayers[id];
  }
}

function setupCallbacks(client) {
  // --- GAME-SPECIFIC EVENTS (player_spit, player_hit) ---
  client.onGameEvent = (msg) => {
    if (msg.type === 'player_spit') {
      const remoteModel = remotePlayers[msg.playerId];
      if (remoteModel) {
        const { makeSpit } = alpacaHandling();
        makeSpit({ model: remoteModel, isDead: false });
      }
    }

    if (msg.type === 'player_hit') {
      if (msg.targetId === client.localPlayerId) {
        gUser.value.hp = msg.health;
        gPlayer.value.hp = msg.health;
        gPlayer.value.isDead = -1
        if (gUser.value.hp === 0) {
          gPlayer.value.isDead = 1
          gUser.value.isPlaying = false
        }
      }
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
      if (p.id === client.localPlayerId) continue; // Skip ourselves

      // --- REMOTE PLAYERS ---
      if (!remotePlayers[p.id]) {
        remotePlayers[p.id] = "loading";

        createAlpaca().then((newAlpaca) => {
          const model = newAlpaca.model;

          // TAG IT FOR THE RAYCASTER
          model.userData.networkId = p.id;

          gScene.value.add(model);
          remotePlayers[p.id] = model;
        });

      } else if (remotePlayers[p.id] !== "loading") {
        remotePlayers[p.id].position.set(p.x, p.y || 0, p.z);
        if (p.angle !== undefined) remotePlayers[p.id].rotation.y = p.angle;
      }
    }
    cleanUpDisconnectedPlayers(serverPlayerIds)
  };

  // --- JOINED: snap to spawn, start sending inputs ---
  client.onJoined = (playerId, spawn) => {
    console.log("Joined multiplayer as:", playerId);

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


function cleanUpDisconnectedPlayers(serverPlayerIds) {
  for (const id in remotePlayers) {
    if (!serverPlayerIds.has(id)) {

      const modelToRemove = remotePlayers[id];

      if (modelToRemove !== "loading" && modelToRemove) {
        // 1. Remove from scene visually
        gScene.value.remove(modelToRemove);

        // 2. Destroy from memory completely
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

      // 3. Remove from our tracking dictionary
      delete remotePlayers[id];
    }
  }
}
