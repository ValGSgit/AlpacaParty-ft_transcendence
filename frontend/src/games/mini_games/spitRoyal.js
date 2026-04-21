import { alpacaHandling } from '../components/alpacaHandling.js';
import { createAlpaca } from '../core/createObjects.js';
import { gMinigame, gPlayer, gScene, gUI, gUser, gCollidables } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { getValidRandomPos } from '../utils/spawnRandomly.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { changeFloorColor } from './utils.js';
import { removeObject, removeFromArray } from '../core/removeObjects.js'
import { remotePlayers, initClient } from './client.js';

export async function initSpitRoyalAI(playerCount, tempAlpacas) {
  gMinigame.value.mode = 1
  playerCount = 10 // total numbers of players
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

export async function initSpitRoyalOnline(matchId) {
  gMinigame.value.mode = 2;
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca');
  gScene.value.add(gPlayer.value.model);
  gUI.cameraMode = 1;
  initClient(0, matchId)
  gMinigame.value.isActive = true;
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
      if (msg.targetId === client.localPlayerId) {
        gUser.value.hp = msg.health;
        gPlayer.value.hp = msg.health;
        gPlayer.value.isDead = -1
        if (gUser.value.hp === 0) {
          gPlayer.value.isDead = 1
          gMinigame.value.isActive = false
          gMinigame.value.isGameOver = true;
        }
      }
      else
      {
        if (msg.ownerId === client.localPlayerId)
        {
          gUser.value.point = msg.point
          gPlayer.value.point = msg.point
        }
        remotePlayers[msg.targetId].isDead = -1
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
          newAlpaca.name = p.name
          remotePlayers[p.id] = newAlpaca;
          gMinigame.value.players.push(newAlpaca);
        });

      } else if (remotePlayers[p.id] !== "loading") {
        if (remotePlayers[p.id].model.position.x !== p.x || remotePlayers[p.id].model.position.z !== p.z || remotePlayers[p.id].model.rotation.y !== p.angle)
          remotePlayers[p.id].isMoving = true
        else
          remotePlayers[p.id].isMoving = false
        if (remotePlayers[p.id].model.position.y > 0)
          remotePlayers[p.id].isJumping = true
        else
          remotePlayers[p.id].isJumping = false
        remotePlayers[p.id].model.position.set(p.x, p.y || 0, p.z);
        if (p.angle !== undefined) remotePlayers[p.id].model.rotation.y = p.angle;
        const index = gMinigame.value.players.findIndex(alpaca => alpaca === remotePlayers[p.id]);
        if (index !== -1){
          gMinigame.value.players[index].hp = p.health // update hp to see if alpaca isDead
          if (gMinigame.value.players[index].hp === 0)
          {
            gMinigame.value.players[index].isDead = 1
            removeFromArray(gMinigame.value.players[index].model, gCollidables)
          }
          gMinigame.value.players = [...gMinigame.value.players]; // force UI update
        }
      }
    }
    cleanUpDisconnectedPlayers(serverPlayerIds)
  };

  // --- JOINED: snap to spawn, start sending inputs ---
  client.onJoined = (playerId, spawn) => {
    console.log("Joined multiplayer as:", playerId);
    if (gMinigame.value.mode !== 4) // don't push gPlayer in alpaca road multiplayer to avoid double
      gMinigame.value.players.push(gPlayer.value);
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
      const index = gMinigame.value.players.findIndex(alpaca => alpaca === remotePlayers[id]);
      if (index !== -1)
        gMinigame.value.players.splice(index, 1);
      delete remotePlayers[id];
    }
  }
}
