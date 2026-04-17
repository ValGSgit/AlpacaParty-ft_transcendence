import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js';
import { useCoinUI } from '../components/coins.js';
import { useFloatingText } from '../components/floatingText.js';
import { CONST } from '../config/constants.js';
import { createAlpaca, createDecoration, createItem } from '../core/createObjects.js';
import { gAlpacas, gMinigame, gPlayer, gScene, gUI } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { removeObject } from '../core/removeObjects.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomInt, getRandomTimer } from '../utils/randomValues.js';
import { adjustSunBox, setSunLight, setupLighting } from '../world/sceneBuilder.js';

const roadLength = 700;
const roadBack = -25;
const roadOffset = roadLength / 2 + roadBack;
let roadSpeed = 25;
const startZ = roadLength + roadBack;

let level;
let alivePlayers;
let initalPlayerCount;
let activePlayers = [];
const playerPositions = [2.5, -2.5, -7.5, 7.5];

let obstacleTimer = 2;
let timerMultiplier = 1;

const fullPaths = ['models/lamp.glb', 'models/concreteBarricade.glb']
const singlePaths = ['models/trafficCones.glb', 'models/barricade.glb']
const sceneryPaths = ['models/newyorkBuilding.glb', 'models/tree.glb', 'models/bankBuilding.glb', 'models/brooklynBuilding.glb']

const fullObstacle = [];
const singleObstacle = [];
const activeObstacles = [];

const buildingSelection = [];
const activeBuildings = [];
const buildingDepth = 60;
const buildingOffset = -30;
const roadScene = [];
let assetsLoaded = false;

let totalPoints = 0;

const { spawnFloatingText } = useFloatingText();
const { collectRewards } = useCoinUI();

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  cleanupAlpacaRoad()

  await setupRoadScene(gScene.value);
  await loadAssets(gScene.value);
  await initPlayers(playerCount, tempAlpacas);
  initScenery();
  initObstacles();
  initGameValues(playerCount);
}

function initGameValues(playerCount) {
  level = 1;
  totalPoints = 0;
  alivePlayers = playerCount;
  initalPlayerCount = playerCount;
  gUI.cameraMode = 2;

  gMinigame.value.mode = 3;
  gMinigame.value.isActive = true;
  gUI.lockCamera = true;
  gUI.DoF = false;
  gUI.isLightCycling = false;
  assetsLoaded = true;
}

async function setupRoadScene(scene) {
  setupLighting(scene);
  setSunLight(25, 125, roadLength / 4, 0, 0, 200);
  adjustSunBox(200, 150, 1, 0, 0, 0);
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
  registerEntity(gPlayer.value, 'alpaca');
  gMinigame.value.players = [];
  for (let i = 0; i < playerCount - 1; i++) {
    if (tempAlpacas[i]) {
      activePlayers.push(tempAlpacas[i]);
      registerEntity(tempAlpacas[i], 'alpaca');
    } else {
      activePlayers.push(await createAlpaca());
    }
  }
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    gScene.value.add(alpaca.model);
    alpaca.model.position.x += playerPositions[i];

    gMinigame.value.players.push({
      id: i + 1,
      name: alpaca.name,
      hp: CONST.HP,
      point: 0
    });
  }
  console.log(gAlpacas)
}

function initScenery() {
  if (buildingSelection.length === 0) return;

  const numBuildings = Math.ceil(roadLength / buildingDepth) + 1;

  let id = 0;
  for (let i = 0; i < numBuildings; i++) {
    const zPos = i * buildingDepth;

    // Right
    id = getRandomID(buildingSelection);
    const rBuild = buildingSelection[id].clone();
    rBuild.position.set(buildingOffset, 0, zPos);
    gScene.value.add(rBuild);
    activeBuildings.push(rBuild);
    rBuild.userData.targetScale = new THREE.Vector3(1, 1, 1);

    // Left
    id = getRandomID(buildingSelection);
    const lBuild = buildingSelection[id].clone();
    lBuild.scale.x = -1;
    lBuild.position.set(-buildingOffset, 0, zPos);
    gScene.value.add(lBuild);
    activeBuildings.push(lBuild);
    lBuild.userData.targetScale = new THREE.Vector3(-1, 1, 1);
  }
}

function initObstacles() {
  const amount = 8;
  for (let i = 0; i < amount; ++i) {
    createObstacle();
    activeObstacles[i].position.z = startZ - (roadLength / amount * i);
  }
}

function initRoadStripes() {
  const numRows = 8;
  const spacingZ = roadLength / numRows;

  const stripeMat = new THREE.MeshStandardMaterial({ color: '#dddddd' });
  const stripe = PRIMITIVES.Box(1, 0.1, 10, stripeMat);

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
  updateDifficulty()

  if (alivePlayers <= 0) {
    endMinigame();
  }
}

function spawnObstacles(delta) {
  if (!gMinigame.value.isActive || fullObstacle.length === 0) return;

  obstacleTimer -= delta;

  if (obstacleTimer <= 0) {
    obstacleTimer = (getRandomTimer() / 2) * timerMultiplier;
    createObstacle();
  }
}

function createObstacle() {
  const validLanes = getValidLanes();
  const pos = validLanes[Math.floor(Math.random() * validLanes.length)];

  let obstacle;
  let id = 0;
  if (pos < 4) {
    id = getRandomID(singleObstacle);
    obstacle = singleObstacle[id].clone();
    obstacle.position.x = playerPositions[pos];
    obstacle.userData.isFullWidth = false;
  } else {
    id = getRandomID(fullObstacle);
    obstacle = fullObstacle[id].clone();
    obstacle.userData.isFullWidth = true;
  }
  attachCollider(obstacle);

  if (Math.random() > 0.5) {
    obstacle.rotation.y = Math.PI;
  }

  obstacle.position.z = startZ;
  obstacle.pointGiven = false;
  obstacle.frustumCulled = false;
  obstacle.traverse(child => { if (child.isMesh) child.frustumCulled = false; });

  activeObstacles.push(obstacle);
  gScene.value.add(obstacle);
}

function getRandomID(array) {
  const id = getRandomInt(array.length);
  return id;
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
    if (alpaca.isDead && alpaca.isBeingHit) {
      if (alpaca.model.position.z > roadBack) {
        alpaca.model.position.z -= (roadSpeed * delta);
      }
    }
  }
}

function updateDifficulty() {
  const pointsPerLevel = 4 + level;
  const avgPoints = totalPoints / initalPlayerCount;
  const newLevel = Math.floor(avgPoints / pointsPerLevel) + 1;


  if (newLevel > level) {
    level = newLevel;

    const minSpeed = 25;
    const maxSpeed = 100;
    const factor = 0.1;
    const difficultyFactor = 1 - Math.exp(-factor * level);
    roadSpeed = minSpeed + (maxSpeed - minSpeed) * difficultyFactor;

    timerMultiplier = Math.max(0.5, timerMultiplier - 0.05);

    showLevelAnnouncement(level);
    console.log("Level:", level);
    console.log("Speed:", roadSpeed);
    console.log("Timer:", timerMultiplier);
  }
}

function showLevelAnnouncement(level) {
  const el = document.createElement('div');
  el.className = 'level-up-announcement';
  el.innerText = `LEVEL ${level}`;

  // Basic styling (usually you'd put this in your CSS file)
  Object.assign(el.style, {
    position: 'absolute',
    top: '25%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '5rem',
    fontWeight: 'bold',
    color: '#FFD700', // Gold
    textShadow: '0 0 20px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    zIndex: '1000',
    transition: 'all 0.5s ease-out'
  });

  document.body.appendChild(el);

  // Animation and Cleanup
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -70%) scale(1.5)';
    setTimeout(() => el.remove(), 500);
  }, 1000);
}

function updateObstacles(delta) {
  for (let j = activeObstacles.length - 1; j >= 0; j--) {
    let obstacle = activeObstacles[j];
    obstacle.updateMatrixWorld(true);
    if (!obstacle) continue;
    obstacle.position.z -= roadSpeed * delta;
    if (obstacle.position.z < -0.25) {
      if (obstacle.userData.isCollider === true && !obstacle.pointGiven) {
        awardPoints(obstacle);
      }
      if (obstacle.position.z < -roadLength / 2 + roadOffset) {
        removeObstacle(obstacle, j);
      }
    }
  }
}

function awardPoints(obstacle) {
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    if (!alpaca.isDead && !alpaca.isBeingHit) {
      if (obstacle.userData.isFullWidth) {
        alpaca.point++;
        totalPoints++;
        spawnFloatingText(alpaca.model, '+1');
      } else {
        const distance = Math.abs(alpaca.model.position.x - obstacle.position.x);
        if (distance < 1) {
          activePlayers[i].point++;
          totalPoints += alivePlayers;
          spawnFloatingText(alpaca.model, '+1');
        }
      }
    }
  }
  console.log("Total:", totalPoints);
  obstacle.pointGiven = true;
}

function removeObstacle(obstacle, index) {
  gScene.value.remove(obstacle);
  activeObstacles.splice(index, 1);
  removeObject(obstacle);
}

function updateRoadScene(delta) {
  const movement = roadSpeed * delta;

  for (let i = 1; i < roadScene.length; i++) {
    const item = roadScene[i];
    item.position.z -= movement;
    if (item.position.z < roadBack) {
      item.position.z = startZ;
    }
  }

  for (let i = 0; i < activeBuildings.length; i++) {
    const building = activeBuildings[i];
    building.position.z -= movement;

    if (building.position.z < roadBack) {
      building.position.z = startZ;
      building.scale.set(0.1, 0.1, 0.1);
    }
    const target = building.userData.targetScale;
    if (building.scale.distanceTo(target) < 0.01) {
      building.scale.copy(building.userData.targetScale);
    } else {
      building.scale.lerp(building.userData.targetScale, delta * 5);
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
    alpaca.hp--;
    spawnFloatingText(alpaca.model, '-💔', 'hearts');
    if (alpaca.hp === 0) {
      alpaca.isDead = true;
      alivePlayers--;
    }
  }
}

function endMinigame() {
  if (gMinigame.value.isGameOver) return;

  let aliveAlpacas = initalPlayerCount;
  for (let i = 0; i < activePlayers.length; i++) {
    const alpaca = activePlayers[i];
    if (!alpaca.isBeingHit && alpaca.isDead) {
      aliveAlpacas--;
    }
  }
  if (aliveAlpacas <= 0) {
    gMinigame.value.isGameOver = true;
    gMinigame.value.isActive = false;
    const playerPoints = activePlayers[0].point || 0;
    const earnedCoins = Math.floor(playerPoints / 10);

    console.log(`Minigame Over! Points: ${playerPoints}, Coins: ${earnedCoins}`);

    if (earnedCoins > 0) {
      setTimeout(() => {
        collectRewards(earnedCoins);
      }, 50);
    }
  }
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
    setSunLight();
    adjustSunBox();
  });

  activePlayers.length = 0;

  gUI.lockCamera = false;
  gUI.cameraMode = 1;
  console.log("🧹 Minigame cleaned up.");
}