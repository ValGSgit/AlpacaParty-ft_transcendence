import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js';
import { CONST } from '../config/constants.js';
import { createAlpaca, createItem } from '../core/createObjects.js';
import { gItems, gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { removeObject } from '../core/removeObjects.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { setupLighting } from '../world/sceneBuilder.js';

const roadLength = 150;
const roadOffset = 25;
const roadSpeed = 15;

let obstacleTimer = 2;
const poleMat = new THREE.MeshStandardMaterial({ color: '#990000' });
const pole = PRIMITIVES.Cylinder(0.5, 20, 64, poleMat);;
const singlePole = PRIMITIVES.Cylinder(0.5, 5, 64, poleMat);

const roadStripes = [];
const stripeLength = 10;

let level = 0;
let alivePlayers;
let activePlayers = [];
const playerPositions = [-2.5, 2.5, -7.5, 7.5];

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  level = 0;
  gUI.cameraMode = 2;
  gMinigame.value.mode = 3;

  gItems.length = 0;

  await setupRoadScene(gScene.value);
  await initPlayers(playerCount, tempAlpacas);
  alivePlayers = playerCount;

  gMinigame.value.isActive = true;
  gUser.value.gameMode = 3;
  gUI.lockCamera = true;
}

async function setupRoadScene(scene) {
  setupLighting(scene);
  const road = PRIMITIVES.Box(30, 1, roadLength, '#666666')
  road.position.y = -road.geometry.parameters.height / 2;
  road.position.z += roadOffset;
  scene.add(road)

  //const itemData = await createItem('/models/lamp.glb');

  initRoadStripes();
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

function initRoadStripes() {
  const numRows = 4;
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
      roadStripes.push(roadStripe);
      gScene.value.add(roadStripe);
      offsetX += 5;
    }
  }
}

//---------------------------- LOOP ----------------------------------

export function updateAlpacaRoad(delta) {
  spawnObstacles(delta)
  updateObstacles(delta)
  updatePlayers(delta)
  updateRoad(delta)
  //updateDifficulty()
}

function spawnObstacles(delta) {
  if (!gUser.value.isPlaying || !pole) return; // Don't spawn if the game is over

  obstacleTimer -= delta;

  if (obstacleTimer <= 0) {
    obstacleTimer = getRandomTimer() / 2; // 1 - 4 sec
    const validLanes = getValidLanes();
    const pos = validLanes[Math.floor(Math.random() * validLanes.length)];

    let obstacle;
    if (pos < 4) {
      obstacle = singlePole.clone();
      obstacle.position.x = playerPositions[pos];
      obstacle.userData.isFullWidth = false;
    } else {
      obstacle = pole.clone();
      obstacle.userData.isFullWidth = true;
    }

    obstacle.position.z = roadLength / 2 + roadOffset;
    attachCollider(obstacle);
    obstacle.rotation.z = Math.PI / 2;
    obstacle.position.y = 0.5;
    obstacle.pointGiven = false;
    registerEntity(obstacle, 'item');
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
    if (alpaca.isDead && !alpaca.isBeingHit && gUser.value.isPlaying) {
      if (alpaca.model.position.z > -roadLength / 2 + roadOffset) {
        alpaca.model.position.z -= (roadSpeed * delta);
      }
    }
  }
}

function updateObstacles(delta) {
  if (!gUser.value.isPlaying || !pole) return;

  for (let j = gItems.length - 1; j >= 0; j--) {
    let item = gItems[j];
    item.position.z -= roadSpeed * delta;
    if (item.position.z < 0) {
      if (item.userData.isCollider === true && !item.pointGiven) {
        awardPoints(item);
        item.pointGiven = true;
      }

      if (item.position.z < -roadLength / 2 + roadOffset) {
        removeObject(item);
      }
    }
  }
}-

function  awardPoints(item) {
  for (let i = 0; i < activePlayers.length; i++) {
    if (!activePlayers[i].isDead && !activePlayers[i].isBeingHit) {
      if (item.userData.isFullWidth) {
        activePlayers[i].point++;
      } else {
        const distance = Math.abs(activePlayers[i].model.position.x - item.position.x);
        if (distance < 0.1)
          activePlayers[i].point++;
      }
    }
  }
}

function updateRoad(delta) {
  const endZ = (-roadLength / 2 + roadOffset) + stripeLength / 2;

  for (let i = 0; i < roadStripes.length; i++) {
    const stripe = roadStripes[i];
    stripe.position.z -= (roadSpeed * delta);
    if (stripe.position.z < endZ) {
      stripe.position.z += roadLength - stripeLength;
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

  const isColliding = checkCollisionWith(alpaca.model, gItems);
  if (isColliding) {
    alpaca.isBeingHit = true;
    alpaca.hp--;
    if (alpaca.hp === 0) {
      alpaca.isDead = true;
      alivePlayers--;
      if (alivePlayers === 0) {
        gMinigame.value.isActive = false;
        gUser.value.isPlaying = false; // TODO
      }
    }
  }
}
