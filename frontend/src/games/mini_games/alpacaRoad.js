import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js';
import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
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
const pole = PRIMITIVES.Cylinder(0.5, 20, 64, poleMat);
const singlePole = PRIMITIVES.Cylinder(0.5, 5, 64, poleMat);

const roadStripes = [];
const stripeLength = 10;

let level = 0;
let alivePlayers;
let activePlayers = [];
const playerPositions = [-2.5, 2.5, -7.5, 7.5];

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  gUser.value.gameMode = 3; // TODO: remove this
  gMinigame.value.isActive = true;
  gMinigame.value.mode = 3;
  gUI.cameraMode = 2;
  gUI.lockCamera = true;

  level = 0;
  setupRoadScene(gScene.value);
  //setupCamera()
  initRoadStripes();
  await initPlayers(playerCount, tempAlpacas);
  alivePlayers = playerCount;
}

// function setupCamera() {
//   gUI.lockCamera = true;
//   const camera = gEngine.value.camera;
//   camera.position.set(0, 15, -30);
//   //camera.lookAt(0, 0, 20);

//   if (gEngine.value.controls) {
//     gEngine.value.controls.target.set(0, 0, 20);
//     gEngine.value.controls.update();
//   }
// }

function setupRoadScene(scene) {
  setupLighting(scene);
  const road = PRIMITIVES.Box(30, 1, roadLength, '#666666')
  road.position.y = -road.geometry.parameters.height / 2;
  road.position.z += roadOffset;

  scene.add(road)
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
  if (!gUser.value.isPlaying) return; // Don't spawn if the game is over

  obstacleTimer -= delta;
  let obstacle;

  if (obstacleTimer <= 0) {
    obstacleTimer = getRandomTimer() / 2; // 1 - 4 sec
    const validLanes = getValidLanes();
    const pos = validLanes[Math.floor(Math.random() * validLanes.length)];

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
  if (!gUser.value.isPlaying) return;

  for (let j = gItems.length - 1; j >= 0; j--) {
    let item = gItems[j];

    // Beautiful use of Units Per Second here!
    item.position.z -= roadSpeed * delta;

    if (item.position.z < 0) {
      if (item.userData.isCollider === true && !item.pointGiven) {

        // Check who gets a point!
        for (let i = 0; i < activePlayers.length; i++) {
          if (!activePlayers[i].isDead && !activePlayers[i].isBeingHit) {

            // If it's a massive pole, everyone alive gets a point
            if (item.userData.isFullWidth) {
              activePlayers[i].point++;
            }
            // If it's a small pole, only the player in that lane gets a point
            else {
              const distance = Math.abs(activePlayers[i].model.position.x - item.position.x);
              if (distance < 0.1) {
                activePlayers[i].point++;
              }
            }

          }
        }
        item.pointGiven = true;
      }

      if (item.position.z < -roadLength / 2 + roadOffset) {
        removeObject(item);
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
