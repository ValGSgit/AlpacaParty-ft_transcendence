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

const miniGameContainer = ref(null)
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)
let onlineClient = null;
const remotePlayers = {};
let timer = 1
let isBeingHit = false

export async function changeGame(mode) {
  if (!gPlayer.value || !gUser.value) return;
  const { isAuthenticated } = useAuthStore()

  if (onlineClient) {
    if (onlineClient._cleanupKeys) onlineClient._cleanupKeys();
    onlineClient.destroy();
    onlineClient = null;
  }
  for (const id in remotePlayers) {
    if (remotePlayers[id] !== "loading") {
      gScene.value.remove(remotePlayers[id]);
    }
    delete remotePlayers[id];
  }

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

async function initSpitRoyalOnline(){
  gUser.value.gameMode = 2;
  
  // 1. Your standard environment setup
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca'); 
  gScene.value.add(gPlayer.value.model);
  gUI.cameraMode = 1;

  // 2. Initialize the network
  onlineClient = new SpitRoyaleClient();
  const playerName = gPlayer.value?.name || 'Vue_Llama';
  onlineClient.connect(playerName);

  onlineClient.onJoined = (playerId) => {
    console.log("Joined as:", playerId);
    
  // Provide inputs to the server
    onlineClient.getInput = () => {
      let vx = gPlayer.value.model.position.x
      let vz = gPlayer.value.model.position.z
      return { vx, vz, angle: 0 }; 
    };
  };

  // 4. Handle Server State Updates
  onlineClient.onStateUpdate = async (state) => {
    const serverPlayerIds = new Set(state.players.map(p => p.id));

    for (const p of state.players) {
      //console.log(p)
      if (p.id === onlineClient.localPlayerId) {
        console.log(p)
        // --- LOCAL PLAYER ---
        // Let the server override your local position (Server Authority)
        //gPlayer.value.model.position.set(p.x, gPlayer.value.model.position.y, p.z);
        // Sync health
        gUser.value.hp = p.health; 
        
      } else {
        // --- REMOTE PLAYERS ---
        if (!remotePlayers[p.id]) {
          // Spawn them using your engine! Let's put a placeholder object for now, 
          // or you can use your spawnObjectRandomly/createAlpaca functions.
          remotePlayers[p.id] = "loading"; // Prevent duplicate spawns while awaiting
          
          const model = await spawnObjectRandomly('/models/alpaca.glb', 10, "alpaca");
          // Apply a color tint to distinguish them if you want
          
          gScene.value.add(model);
          remotePlayers[p.id] = model;
        } else if (remotePlayers[p.id] !== "loading") {
          // Update remote player position
          remotePlayers[p.id].position.set(p.x, remotePlayers[p.id].position.y, p.z);
        }
      }
    }

    // --- CLEANUP DISCONNECTED PLAYERS ---
    for (const id in remotePlayers) {
      if (!serverPlayerIds.has(id)) {
        if (remotePlayers[id] !== "loading") {
          gScene.value.remove(remotePlayers[id]);
        }
        delete remotePlayers[id];
      }
    }
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