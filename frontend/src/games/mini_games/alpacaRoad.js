import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js';
import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
import { gAlpacas, gItems, gMultiplayer, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { removeObject } from '../core/removeObjects.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomSpeed, getRandomTimer } from '../utils/randomValues.js';
import { setupLighting } from '../world/sceneBuilder.js';

let timer = 2;
let levelUpFactor;
let alivePlayers;
const roadLength = 150;
const roadOffset = 25;

const roadSpeed = 0.75;
const poleMat = new THREE.MeshStandardMaterial({ color: '#990000' });
const pole = PRIMITIVES.Cylinder(0.5, 20, 64, [poleMat]);
const roadStripes = [];
const stripeLength = 10;
const playerPositions = [-2.5, 2.5, -7.5, 7.5];

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  gUser.value.gameMode = 3;
  levelUpFactor = 10;

  setupRoadScene(gScene.value);
  initRoadStripes();
  await initPlayers(playerCount, tempAlpacas);
  alivePlayers = playerCount;

  gUI.cameraMode = 1;
}

function setupRoadScene(scene) {
  setupLighting(scene);
  const road = PRIMITIVES.Box(30, 1, roadLength, '#666666')
  road.position.y = -road.geometry.parameters.height / 2;
  road.position.z += roadOffset;

  scene.add(road)
}

async function initPlayers(playerCount, tempAlpacas) {
  const activePlayers = [gPlayer.value];
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

    gMultiplayer.value.players.push({
      id: i + 1,
      name: alpaca.name,
      hp: CONST.HP,
      point: 0
    });
  }
}

export function initRoadStripes() {
  gUI.lockCamera = true;
  const numRows = 1;

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

export function spawnObstacles(delta) {
  updateRoadTreadmill(delta);
  timer -= delta;
  return;

  if (timer <= 0) {
    gUI.lockCamera = true;
    timer = (getRandomTimer() * levelUpFactor) / 10;

    const obstacle = pole.clone();
    obstacle.position.z = CONST.BASE_RADIUS * 2;
    attachCollider(obstacle);
    obstacle.rotation.z = Math.PI / 2;
    obstacle.position.x = -2.5;
    obstacle.position.y = 0.5;
    obstacle.pointGiven = false;
    obstacle.speed = getRandomSpeed();

    gScene.value.add(obstacle);
    registerEntity(obstacle, 'item');
  }
}

export function updateRoadTreadmill(delta) {
  const endZ = (-roadLength / 2 + roadOffset) + stripeLength / 2;

  for (let i = 0; i < roadStripes.length; i++) {
    const stripe = roadStripes[i];
    stripe.position.z -= (roadSpeed * delta * 60);
    if (stripe.position.z < endZ) {
      stripe.position.z += roadLength - stripeLength;
    }
  }
}

export function updateObstacles(delta) {
  for (let i = 0; i < gAlpacas.length; ++i) {
    // Sync UI hp and points
    if (i === 0) { gUser.value.hp = gAlpacas[0].hp; gUser.value.point = gAlpacas[0].point; }
    else if (i === 1) { gUser.value.hp2p = gAlpacas[1].hp; gUser.value.point2p = gAlpacas[1].point; }
    else if (i === 2) { gUser.value.hp3p = gAlpacas[2].hp; gUser.value.point3p = gAlpacas[2].point; }
    else if (i === 3) { gUser.value.hp4p = gAlpacas[3].hp; gUser.value.point4p = gAlpacas[3].point; }

    checkAlpaca(gAlpacas[i]);

    if (gAlpacas[i].isBeingHit) {
      spinAlpacaUp(gAlpacas[i], delta);
    }

    if (gAlpacas[i].isDead && !gAlpacas[i].isBeingHit && gUser.value.isPlaying) {
      if (gAlpacas[i].model.position.z > -CONST.BASE_RADIUS) {
        gAlpacas[i].model.position.z -= (roadSpeed * delta);
      }
    }
  }

  // Iterate backwards so removing items doesn't skip array indexes
  for (let j = gItems.length - 1; j >= 0; j--) {
    let item = gItems[j];

    if (gUser.value.isPlaying) {
      item.position.z -= (item.speed * delta);
    }

    if (item.position.z < 0) {
      if (item.userData.isCollider === true && !item.pointGiven) {
        for (let a = 0; a < gAlpacas.length; ++a) {
          if (!gAlpacas[a].isDead && !gAlpacas[a].isBeingHit) {
            gAlpacas[a].point++;
          }
        }
        item.pointGiven = true;
        if (levelUpFactor > 3 && gPlayer.value.point % 5 === 0) {
          levelUpFactor -= 1;
        }
      }
      if (item.position.z < -CONST.BASE_RADIUS) {
        removeObject(item);
      }
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
      alpaca.isDead = 1;
      alivePlayers--;
      if (alivePlayers === 0) {
        gUser.value.isPlaying = false;
      }
    }
  }
}
