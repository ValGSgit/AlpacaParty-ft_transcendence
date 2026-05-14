import * as THREE from 'three';
import { useFloatingText } from '../components/floatingText.js';
import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
import { gMinigame, gPlayer, gScene, gUI } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { removeObject } from '../core/removeObjects.js';
import { getValidRandomPos } from '../utils/spawnRandomly.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { activeClient } from './GameClient.js';
import { changeFloorColor } from './utils.js';
import { initRigidBody } from '../core/useRapier.js';

let activePlayers = [];

const { spawnFloatingText } = useFloatingText();

export function shootSpitAction(directionVec) {
  if (!gPlayer.value || gPlayer.value.isDead === 1) return;

  let safeDir = null;
  if (directionVec && typeof directionVec.x === 'number' && typeof directionVec.z === 'number') {
    safeDir = directionVec;
  }

  activeClient.sendSpit(safeDir);
  gPlayer.value.spit();
}

export async function initSpitRoyalAI(playerCount, tempAlpacas) {
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca');
  if (!gPlayer.value.physicsBody)
    initRigidBody(gPlayer.value, gPlayer.value.model.position)
  gScene.value.add(gPlayer.value.model);
  gMinigame.value.players.push({ id: 1, name: gPlayer.value.name, hp: CONST.HP, point: 0 });

  for (let i = 0; i < playerCount - 1; i++) {
    let alpaca;
    const data = await getValidRandomPos('/models/alpaca.glb', 1);
    if (tempAlpacas[i]) {
      alpaca = tempAlpacas[i];
      registerEntity(alpaca, 'alpaca');
      alpaca.model.position.set(data[0].position[0], data[0].position[1], data[0].position[2]);
    } else {
      alpaca = await createAlpaca(null, null, data[0].position, data[0].rotation, data[0].scale);
    }
    if (!alpaca.physicsBody)
      initRigidBody(alpaca, data[0].position)
    gScene.value.add(alpaca.model);
  }

  gUI.cameraMode = 1;
  gMinigame.value.isActive = true;
}

export async function initSpitRoyalOnline() {
  cleanupSpitRoyal();
  gMinigame.value.mode = 2;

  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');

  activePlayers.length = 0;
  gPlayer.value.point = 0;
  gPlayer.value.socketId = activeClient.socket.id;
  gPlayer.value.hp = 3;
  gPlayer.value.hasSpawned = false;

  gScene.value.add(gPlayer.value.model);
  activePlayers.push(gPlayer.value);
  registerEntity(gPlayer.value, 'alpaca');

  gUI.cameraMode = 1;
  gMinigame.value.isActive = true;
}

export function updateSpitRoyal(delta) {
  if (!gMinigame.value.isActive || gMinigame.value.isGameOver) return;

  if (gMinigame.value.spawnData && !gPlayer.value.hasSpawned)
    spawnPlayer();

  syncPlayers(delta);
  spawnEnemySpits();
  streamLocalPosition();
}

function spawnPlayer() {
  const spawn = gMinigame.value.spawnData;
  gPlayer.value.model.position.set(spawn.x, 0, spawn.z);
  //TODO
  //gPlayer.value.target.copy(gPlayer.value.model.position);
  gPlayer.value.model.rotation.y = spawn.angle;

  gPlayer.value.hasSpawned = true;
  gPlayer.value.isAutoMoving = false;
  gMinigame.value.spawnData = null;
}

function streamLocalPosition() {
  if (!gPlayer.value || !gPlayer.value.hasSpawned) return;

  const model = gPlayer.value.model;
  activeClient.sendPlayerInput(model.position.x, model.position.y, model.position.z, model.rotation.y);
}

function spawnEnemySpits() {
  const events = activeClient.spitQueue;
  if (!events || events.length === 0) return;

  while (events.length > 0) {
    const spitData = events.shift();
    const shooter = activePlayers.find(p => p.socketId === spitData.ownerId);

    if (shooter && shooter.socketId !== activeClient.socket.id && typeof shooter.spit === 'function') {
      try {
        // THE FIX: Only rotate if direction is a valid Vector. Prevents NaN matrix corruption!
        if (spitData.direction && typeof spitData.direction.x === 'number' && typeof spitData.direction.z === 'number') {
          const dir = new THREE.Vector3(spitData.direction.x, 0, spitData.direction.z).normalize();
          if (!isNaN(dir.x) && !isNaN(dir.z)) {
            shooter.model.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }
        shooter.spit();
      } catch (e) {
        console.warn("Skipped enemy spit rendering due to loading state.");
      }
    }
  }
}

function syncPlayers(delta) {
  const serverPlayers = gMinigame.value.players;
  if (!serverPlayers) return;

  // Add new players
  serverPlayers.forEach(sPlayer => {
    let localAlpaca = activePlayers.find(p => p.socketId === sPlayer.id);
    if (!localAlpaca) {
      const placeholder = { socketId: sPlayer.id, isSpawning: true };
      activePlayers.push(placeholder);

      createAlpaca().then(newAlpaca => {
        const index = activePlayers.findIndex(p => p.socketId === sPlayer.id);
        if (index !== -1) {
          newAlpaca.socketId = sPlayer.id;
          if (sPlayer.color) newAlpaca.setColor(sPlayer.color);
          gScene.value.add(newAlpaca.model);
          registerEntity(newAlpaca, 'alpaca');
          activePlayers[index] = newAlpaca;
        }
      });
    }
  });

  // Remove disconnected players
  for (let i = activePlayers.length - 1; i >= 0; i--) {
    const localAlpaca = activePlayers[i];
    if (!serverPlayers.find(p => p.id === localAlpaca.socketId)) {
      if (localAlpaca.model) removeObject(localAlpaca.model);
      activePlayers.splice(i, 1);
    }
  }

  // Update Positions & States
  for (let i = 0; i < activePlayers.length; i++) {
    const localAlpaca = activePlayers[i];
    if (localAlpaca.isSpawning) continue;

    const serverData = serverPlayers.find(p => p.id === localAlpaca.socketId);
    if (serverData) {

      // LOCAL PLAYER SPAWN FIX
      if (localAlpaca.socketId === activeClient.socket.id) {
        if (!localAlpaca.hasSpawned) {
          localAlpaca.model.position.set(serverData.x, serverData.y, serverData.z);
          localAlpaca.hasSpawned = true;
          localAlpaca.isAutoMoving = false;
        }
      }
      // REMOTE PLAYER SYNC
      else {
        const targetPos = new THREE.Vector3(serverData.x, serverData.y, serverData.z);
        const oldPos = localAlpaca.model.position.clone();

        localAlpaca.model.position.lerp(targetPos, delta * 10);

        const movedDist = oldPos.distanceTo(localAlpaca.model.position);
        localAlpaca.isMoving = movedDist > (1.0 * delta);

        const targetRot = serverData.angle;
        let diff = targetRot - localAlpaca.model.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        localAlpaca.model.rotation.y += diff * delta * 10;
      }

      // Shared States
      if (serverData.hp < localAlpaca.hp) {
        spawnFloatingText(localAlpaca.model, '-💔', 'hearts');
      }

      if (serverData.isDead && localAlpaca.isDead !== 1) {
        localAlpaca.model.rotation.x = Math.PI / 2;
        localAlpaca.model.position.y = 0.5;
        localAlpaca.isMoving = false;
      }

      localAlpaca.hp = serverData.hp;
      localAlpaca.point = serverData.point;
      localAlpaca.isDead = serverData.isDead ? 1 : 0;
    }
  }
}

function cleanupSpitRoyal() {
  activePlayers.forEach(alpaca => {
    if (alpaca !== gPlayer.value) {
      removeObject(alpaca.model);
    } else {
      alpaca.model.position.set(0, 0, 0);
      alpaca.model.rotation.set(0, 0, 0);
      alpaca.isDead = 0;
      alpaca.hp = CONST.HP;
      alpaca.hasSpawned = false; // Reset for next game
    }
  });
  activePlayers.length = 0;
  gMinigame.value.isGameOver = false;
}