import { gScene, gPlayer, gAlpacas, gUI, gUser, gCollidables, gItems, gEngine} from '../core/globals.js';
import { setupEnvironment } from '../world/sceneBuilder.js'
import { registerEntity } from '../core/registerEntity.js';
import { SpitRoyaleClient } from './client.js'
import { changeFloorColor } from './utils.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';
import { createAlpaca } from '../core/createObjects.js'
import { alpacaHandling } from '../components/alpacaHandling.js';

let onlineClient = null;
const remotePlayers = {};
let originalSpitFn = null; // Store the original spit function to restore later


export async function initSpitRoyalAI(){

  gUser.value.gameMode = 1
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
  gScene.value.add(await spawnObjectRandomly('/models/alpaca.glb', 10, "alpaca"))
}

export async function initSpitRoyalOnline() {
  gUser.value.gameMode = 2;
  
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca'); 
  gScene.value.add(gPlayer.value.model);
  gUI.cameraMode = 1;

  onlineClient = new SpitRoyaleClient();
  window.onlineClient = onlineClient; // Expose it globally so alpacaHandling can reach it easily
  const playerName = gUser.value?.name || 'Vue_Llama'; 
  onlineClient.connect(playerName);

  // --- HOOK LOCAL SPIT ---
  originalSpitFn = gPlayer.value.spit;
  gPlayer.value.spit = () => {
    originalSpitFn.call(gPlayer.value); 
    if (onlineClient) onlineClient.socket.emit('spit'); // Tell server we shot!
  };

  listenServerEvents(onlineClient)
}

export function cleanupClient()
{
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

function listenServerEvents(onlineClient){
  onlineClient.socket.on('spit:message', (msg) => {
    
    // 1. A remote player shot a laser!
    if (msg.type === 'player_spit') {
      const remoteModel = remotePlayers[msg.playerId];
      if (remoteModel) {
        const { makeSpit } = alpacaHandling();
        // Pass a mock object that makeSpit can read (it only needs the model)
        makeSpit({ model: remoteModel, isDead: false }); 
      }
    }
    
    // 2. Someone took damage
    if (msg.type === 'player_hit') {
       if (msg.targetId === onlineClient.localPlayerId) {
         gUser.value.hp = msg.health; // Update my UI
         gPlayer.value.hp = msg.health;
         // You can trigger your beingHit animation here!
         gPlayer.value.isDead = -1
         if (gUser.value.hp === 0)
         {
          gPlayer.value.isDead = 1
          gUser.value.isPlaying = false
         }
       }
    }
  });

  onlineClient.onStateUpdate = (state) => {
    const serverPlayerIds = new Set(state.players.map(p => p.id));

    for (const p of state.players) {
      if (p.id === onlineClient.localPlayerId) continue; // Skip ourselves
      
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

  onlineClient.onJoined = (playerId, spawn) => {
    console.log("Joined multiplayer as:", playerId);
    
    // --- SNAP TO RANDOM SPAWN ---
    if (spawn) {
      gPlayer.value.model.position.set(spawn.x, 0, spawn.z);
      gPlayer.value.model.rotation.y = spawn.angle;
    }
    
    // --- START SENDING INPUTS ---
    onlineClient.getInput = () => {
      return { 
        x: gPlayer.value?.model.position.x || 0,
        y: gPlayer.value?.model.position.y || 0,
        z: gPlayer.value?.model.position.z || 0,
        angle: gPlayer.value?.model.rotation.y || 0
      }; 
    };
  };
}


function cleanUpDisconnectedPlayers(serverPlayerIds){
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