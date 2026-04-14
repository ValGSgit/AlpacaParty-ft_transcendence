import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js';
import { CONST } from '../config/constants.js';
import { createAlpaca, createDecoration, createItem } from '../core/createObjects.js';
import { gDecorations, gItems, gMinigame, gPlayer, gScene, gUI} from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { setupLighting } from '../world/sceneBuilder.js';
import { useFloatingText } from '../components/floatingText.js';
import { removeObject } from '../core/removeObjects.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const stripeLength = 10;
const roadLength = 700;
const roadOffset = 100;
const roadSpeed = 50;

let level = 0;
let alivePlayers;
let activePlayers = [];
const playerPositions = [-2.5, 2.5, -7.5, 7.5];

let obstacleTimer = 2;

const fullPaths = ['models/lamp.glb']
const singlePaths = ['models/trafficCones.glb']
const sceneryPaths = ['models/newyorkBuilding.glb']

const fullObstacle = [];
const singleObstacle = [];
const activeObstacles = [];

const buildingSelection = []; // Templates loaded from GLB
const activeBuildings = [];   // Instances currently on the road
const buildingDepth = 60;     // How "wide" the building is along the Z axis
const roadSideOffset = 0;    // Distance from center of road to the buildings
const roadScene = [];
let assetsLoaded = false;

const { spawnFloatingText } = useFloatingText();

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  level = 0;
  cleanupAlpacaRoad()
  gUI.cameraMode = 2;

  await setupRoadScene(gScene.value);
  await loadAssets(gScene.value);
  await initPlayers(playerCount, tempAlpacas);
  initScenery()
  alivePlayers = playerCount;

  gMinigame.value.mode = 3;
  gMinigame.value.isActive = true;
  gUI.lockCamera = true;
  gUI.DoF = true;
  gUI.isLightCycling = false;
  assetsLoaded = true;
}

async function setupRoadScene(scene) {
  setupLighting(scene);
  const road = PRIMITIVES.Box(30, 1, roadLength, '#666666')
  road.position.y = -road.geometry.parameters.height / 2;
  road.position.z += roadOffset;
  scene.add(road)

  const sidewalk = await createDecoration('/models/sidewalk.glb');
  roadScene.push(sidewalk.model)
  scene.add(sidewalk.model);

  initRoadStripes();
}

async function loadAssets() {
  if (fullObstacle.length === 0) {
    const loadedFull = await Promise.all(fullPaths.map(path => createItem(path)));
    loadedFull.forEach(item => {
      fullObstacle.push(item.model);
    });
  }

  if (singleObstacle.length === 0) {
    const loadedSingle = await Promise.all(singlePaths.map(path => createItem(path)));
    loadedSingle.forEach(item => {
      singleObstacle.push(item.model);
    });
  }

  if (buildingSelection.length === 0) {
    const loadedAssets = await Promise.all(sceneryPaths.map(path => createDecoration(path)));
    loadedAssets.forEach(item => {
      buildingSelection.push(item.model);
    });
  }

}

async function initPlayers(playerCount, tempAlpacas) {
  activePlayers.length = 0;
  activePlayers.push(gPlayer.value);
  gMinigame.value.players = [];
  for (let i = 0; i < playerCount - 1; i++) {
    if (tempAlpacas[i]) {
      activePlayers.push(tempAlpacas[i]);
    } else {
      activePlayers.push(await createAlpaca());
    }
  }

  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    registerEntity(alpaca, 'alpaca');
    gScene.value.add(alpaca.model);
    alpaca.model.position.x += playerPositions[i];

    gMinigame.value.players.push({
      id: i + 1,
      name: alpaca.name,
      hp: CONST.HP,
      point: 0
    });
  }
}

function initScenery() {
  if (buildingSelection.length === 0) return;

  // Calculate how many buildings we need to cover the entire road length
  const numBuildings = Math.ceil(roadLength / buildingDepth) + 2; 
  const startZ = -roadLength / 2 + roadOffset;

  for (let i = 0; i < numBuildings; i++) {
    const zPos = startZ + (i * buildingDepth);

    // 1. Create Right Side Building
    const bRight = buildingSelection[0].clone();
    bRight.position.set(0, 0, zPos);
    gScene.value.add(bRight);
    activeBuildings.push(bRight);

    // 2. Create Left Side Building (MIRRORED)
    const bLeft = buildingSelection[0].clone();
    bLeft.scale.x = -1;
    bLeft.position.set(-0, 0, zPos);
    gScene.value.add(bLeft);
    activeBuildings.push(bLeft);
  }
}

function initRoadStripes() {
  const numRows = 7;
  const spacingZ = roadLength / numRows;
  const startZ = (roadLength / 2 + roadOffset) - stripeLength / 2;

  const stripeMat = new THREE.MeshStandardMaterial({ color: '#dddddd' });
  const stripe = PRIMITIVES.Box(1, 0.1, stripeLength, stripeMat);

  for (let row = 0; row < numRows; row++) {
    let offsetX = -5;
    for (let lane = 0; lane < 3; lane++) {
      const roadStripe = stripe.clone();
      roadStripe.position.z = startZ - (row * spacingZ);
      roadStripe.position.x = offsetX;
      roadScene.push(roadStripe);
      gScene.value.add(roadStripe);
      offsetX += 5;
    }
  }
}

//---------------------------- LOOP ----------------------------------


export function updateAlpacaRoad(delta) {
	if (!assetsLoaded) return;

	spawnObstacles(delta)
	updateObstacles(delta)
	updatePlayers(delta)
	updateRoadScene(delta)
	//updateDifficulty()
}

function spawnObstacles(delta) {
  if (!gMinigame.value.isActive || fullObstacle.length === 0) return;

  obstacleTimer -= delta;

  if (obstacleTimer <= 0) {
    obstacleTimer = getRandomTimer() / 2;
    const validLanes = getValidLanes();
    const pos = validLanes[Math.floor(Math.random() * validLanes.length)];

    let obstacle;
    if (pos < 4) {
      obstacle = singleObstacle[0].clone();
      obstacle.position.x = playerPositions[pos];
      obstacle.userData.isFullWidth = false;
    } else {
      obstacle = fullObstacle[0].clone();
      obstacle.userData.isFullWidth = true;
    }

    attachCollider(obstacle);

    obstacle.position.z = roadLength / 2 + roadOffset;
    obstacle.pointGiven = false;
    obstacle.frustumCulled = false;
    obstacle.traverse(child => { if(child.isMesh) child.frustumCulled = false; });

    activeObstacles.push(obstacle);
    gScene.value.add(obstacle);
  }
}
  

function getValidLanes() {
  const validLanes = [4];
  for (let i = 0; i < activePlayers.length; i++) {
    if (!activePlayers[i].isDead) {
      validLanes.push(i);
    }
  }
  return validLanes;
}

function updatePlayers(delta) {
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    if (gMinigame.value.players[i]) {
      gMinigame.value.players[i].hp = alpaca.hp;
      gMinigame.value.players[i].point = alpaca.point;
    }
    checkAlpaca(alpaca);
    if (alpaca.isBeingHit) {
      spinAlpacaUp(alpaca, delta);
    }
    if (alpaca.isDead && !alpaca.isBeingHit) {
      if (alpaca.model.position.z > -roadLength / 2 + roadOffset) {
        alpaca.model.position.z -= (roadSpeed * delta);
      }
    }
  }
}

function updateObstacles(delta) {
  for (let j = activeObstacles.length - 1; j >= 0; j--) {
    let obstacle = activeObstacles[j];
    obstacle.updateMatrixWorld(true);
    if (!obstacle) continue;
    obstacle.position.z -= roadSpeed * delta;
    if (obstacle.position.z < 0) {
      if (obstacle.userData.isCollider === true && !obstacle.pointGiven) {
        awardPoints(obstacle);
      }
      if (obstacle.position.z < -roadLength / 2 + roadOffset) {
        removeObstacle(obstacle, j);
      }
    }
  }
}

function  awardPoints(obstacle) {
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    if (!alpaca.isDead && !alpaca.isBeingHit) {
      if (obstacle.userData.isFullWidth) {
        alpaca.point++;
        spawnFloatingText(alpaca.model, '+1');
      } else {
        const distance = Math.abs(alpaca.model.position.x - obstacle.position.x);
        if (distance < 1) {
          activePlayers[i].point++;
          spawnFloatingText(alpaca.model, '+1');
        }
      }
    }
  }
  obstacle.pointGiven = true;
}

function removeObstacle(obstacle, index){
  gScene.value.remove(obstacle);
  activeObstacles.splice(index, 1);
  removeObject(obstacle);
}

function updateRoadScene(delta) {
const movement = roadSpeed * delta;
const backThreshold = -roadLength / 2 + roadOffset; // Where buildings "disappear"
const teleportDistance = roadLength;    // How far forward they jump

// 1. Update Stripes & Sidewalks (Existing logic)
for (let i = 1; i < roadScene.length; i++) {
  const item = roadScene[i];
  item.position.z -= movement;
  if (item.position.z < backThreshold + roadOffset) {
    item.position.z += teleportDistance;
  }
}

// 2. Update Buildings (The City Loop)
for (let i = 0; i < activeBuildings.length; i++) {
  const bld = activeBuildings[i];
  bld.position.z -= movement;

  // If the building passes the player and goes off-screen
  if (bld.position.z < backThreshold) {
    // ✅ Teleport to the front of the "conveyor belt"
    bld.position.z += teleportDistance + 200;
    
    // Optional: Randomize which building model is used if you have multiple
    // if (buildingSelection.length > 1) { swapModelLogic(); }
  }
}
}

function spinAlpacaUp(alpaca, delta) {
  const spinSpeed = 6.0 * (delta);
  const liftSpeed = 30 * (delta);

  alpaca.model.rotation.x += spinSpeed;

  if (alpaca.model.rotation.x < Math.PI) {
    alpaca.model.position.y += liftSpeed;
  } else {
    alpaca.model.position.y -= liftSpeed;
  }

  if (alpaca.model.rotation.x > Math.PI * 2) {
    alpaca.model.rotation.x = 0;
    alpaca.model.position.y = 0;
    alpaca.isBeingHit = false;
  }
}

function checkAlpaca(alpaca) {
  if (alpaca.isDead || alpaca.isBeingHit) return;

  const { checkCollisionWith } = usePhysics();

  const isColliding = checkCollisionWith(alpaca.model, activeObstacles);
  if (isColliding) {
    alpaca.isBeingHit = true;
    //alpaca.hp--;
    spawnFloatingText(alpaca.model, '-💔', 'hearts');
    if (alpaca.hp === 0) {
      alpaca.isDead = true;
      alivePlayers--;
      if (alivePlayers === 0) {
        endMinigame();
      }
    }
  }
}

function endMinigame() {
  let hitAlpacas;
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    if (alpaca.isBeingHit) hitAlpacas++;
  }
  if (hitAlpacas == alivePlayers)
    gMinigame.value.isActive = false
}

export function cleanupAlpacaRoad() {
  assetsLoaded = false;
  gMinigame.value.isActive = false; 
  gUI.DoF = false;
  gUI.isLightCycling = true;

  activeObstacles.forEach(obj => {
    gScene.value.remove(obj);
  });
  activeObstacles.length = 0;

  roadScene.forEach(item => {
    gScene.value.remove(item);
  });
  roadScene.length = 0;

  activePlayers.forEach(alpaca => {
    if (alpaca !== gPlayer.value) {
      gScene.value.remove(alpaca.model);
    } else {
      alpaca.model.position.set(0, 0, 0);
      alpaca.model.rotation.set(0, 0, 0);
      alpaca.isDead = false;
      alpaca.isBeingHit = false;
    }
  });
  
  activePlayers.length = 0;
  
  gUI.lockCamera = false;
  gUI.cameraMode = 1;

  console.log("🧹 Minigame cleaned up.");
}