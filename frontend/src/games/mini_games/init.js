import { ref } from 'vue'
import { saveGame } from '../core/saveLoadGame.js'
import { useGameEngine } from '../core/useGameEngine.js'
import { gScene, gPlayer, gAlpacas, gUI, gUser, gCollidables, gItems, gEngine} from '../core/globals.js';
import { initWorld } from '../world/initWorld.js'
import { createAlpaca, createItem } from '../core/createObjects.js'
import { useAuthStore } from '../../stores/auth.js'
import { setupEnvironment } from '../world/sceneBuilder.js'
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';
import { CONST } from '../config/constants.js';
import { registerEntity } from '../core/registerEntity.js';
import { clearCoins } from '../components/coins.js'
import * as GRADIENT from "../utils/createGradient.js"
import { SpitRoyaleClient } from './client.js'
import { getRandomTimer } from '../utils/randomValues.js';
import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js'
import { removeObject } from '../core/removeObjects.js'
import { usePhysics } from '../core/usePhysics.js'
import { attachCollider } from '../core/useCollider.js';
import { alpacaHandling } from '../components/alpacaHandling.js';

const miniGameContainer = ref(null)
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)
let onlineClient = null;
const remotePlayers = {};
let originalSpitFn = null; // Store the original spit function to restore later

let timer = 1
let isBeingHit = false

export async function changeGame(mode) {
  if (!gPlayer.value || !gUser.value) return;
  const { isAuthenticated } = useAuthStore()

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

  // Reset state
  gUI.gameMenu = false
  gPlayer.value.hp = CONST.HP
  gUser.value.hp = CONST.HP
  gUser.value.isPlaying = true
  gPlayer.value.point = 0
  gUser.value.point = 0
  gPlayer.value.model.position.set(0, 0, 0)
  gPlayer.value.model.rotation.y = 0
  clearScene(gScene.value)
  clearCoins()
  resetGArrays()
  if (mode === 1)
    initSpitRoyalAI()
  else if (mode === 2)
    initSpitRoyalOnline()
  else if (mode === 3)
    initAlpacaRoad()
  else {
  gUser.value.isPlaying = false
  gUser.value.gameMode = 0
  gPlayer.value = null
  gUI.cameraMode = 0
  await initWorld(gScene.value, isAuthenticated)
  saveGame()
  }
}

async function initAlpacaRoad(){

  gUser.value.gameMode = 3
  setupEnvironment(gScene.value)
  changeFloorColor('#454545', '#454545')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
}

async function initSpitRoyalAI(){

  gUser.value.gameMode = 1
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
  gScene.value.add(await spawnObjectRandomly('/models/alpaca.glb', 10, "alpaca"))
}

function initSpitRoyalOnline() {
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

  // --- LISTEN FOR SERVER EVENTS ---
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
  
// --- CLEANUP DISCONNECTED PLAYERS ---
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
        x: gPlayer.value.model.position.x,
        y: gPlayer.value.model.position.y,
        z: gPlayer.value.model.position.z,
        angle: gPlayer.value.model.rotation.y 
      }; 
    };
  };
}

function changeFloorColor(top, bottom){
  const floorMat = gScene.value?.floor?.material?.[1];
  if (!floorMat) return;
  const newTexture = GRADIENT.Radial(top, bottom);
  if (floorMat.map) floorMat.map.dispose();
  floorMat.map = newTexture;
  floorMat.needsUpdate = true;
}

export function spawnObstacles(delta) {

  timer -= delta;
  if (timer <= 0) {
    timer = getRandomTimer();
    console.log("Spawn item!");
    const texture = GRADIENT.Radial('#550000', '#550000')
    const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
    const matSide = new THREE.MeshStandardMaterial({ color: '#550000', roughness: 0.8 })
    const item = PRIMITIVES.Cylinder(0.5, 10, 64, [matSide, matTop, matSide])
    item.position.z = CONST.BASE_RADIUS
    attachCollider(item)
    item.rotation.z = Math.PI / 2
    item.position.y = 0.5
    gScene.value.add(item)
    registerEntity(item, 'item')
  }
}

export function updateObstacles() {
  const { checkCollisionWith } = usePhysics()
  let i = 0
  if (isBeingHit)
  {
    gPlayer.value.model.rotation.x += 0.1
      if (gPlayer.value.model.rotation.x < Math.PI)
        gPlayer.value.model.position.y += 0.5
      else
        gPlayer.value.model.position.y -= 0.5
      if (gPlayer.value.model.rotation.x > Math.PI * 2) //  360 degree
      {
        gPlayer.value.model.rotation.x = 0
        gPlayer.value.model.position.y = 0
        isBeingHit = false
      }
  }
  while (gItems[i])
  {
    let item = gItems[i]
    item.position.z -= 0.5
    const isColliding = checkCollisionWith(gPlayer.value.model, gCollidables);
    if (isColliding && !gPlayer.value.isDead)
    {
      isBeingHit = true
      gPlayer.value.hp--
      gUser.value.hp--
      removeObject(item)
      if (gPlayer.value.hp === 0)
      {
        gPlayer.value.isDead = 1
        gUser.value.isPlaying = false
      }
      break
    }
    if (item.position.z < -5) // get score
    {
      removeObject(item)
      if (!gPlayer.value.isDead)
      {
        gUser.value.point++
        gPlayer.value.point++
      }
    }
    i++
  }
}