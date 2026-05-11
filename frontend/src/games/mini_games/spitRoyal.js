import * as THREE from 'three';
import { useFloatingText } from '../components/floatingText.js';
import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
import { gMinigame, gPlayer, gScene, gUI } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { getValidRandomPos } from '../utils/spawnRandomly.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { activeClient } from './GameClient.js';
import { changeFloorColor } from './utils.js';

let activePlayers = [];
let localProjectiles = [];
let activeTimer = 1.0;

const { spawnFloatingText } = useFloatingText();

// Expose a global function so GameClient can teleport us when we drop in
window.setLocalPlayerSpawn = (spawnData) => {
  if (gPlayer.value && gPlayer.value.model) {
    gPlayer.value.model.position.set(spawnData.x, 0, spawnData.z);
    gPlayer.value.model.rotation.y = spawnData.angle;
  }
};

export async function initSpitRoyalAI(playerCount, tempAlpacas) {
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gMinigame.value.players.push({ id: 1, name: gPlayer.value.name, hp: CONST.HP, point: 0 });
  for (let i = 0; i < playerCount - 1; i++) {
    let alpaca;
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

  gUI.cameraMode = 1
  gMinigame.value.isActive = true;
}

export async function initSpitRoyalOnline() {
  cleanupSpitRoyal();
  gMinigame.value.mode = 2; // Online Spit Royale

  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');

  activePlayers.length = 0;
  gPlayer.value.socketId = activeClient.socket.id;
  gPlayer.value.hp = 3;

  gScene.value.add(gPlayer.value.model);
  activePlayers.push(gPlayer.value);
  registerEntity(gPlayer.value, 'alpaca');

  gUI.cameraMode = 1;
  gMinigame.value.isActive = true;
}

export function updateSpitRoyal(delta) {
  if (!assetsLoaded || !gMinigame.value.isActive) return;

  if (gMinigame.value.isGameOver) {
    gMinigame.value.isActive = false;
    return;
  }

  syncPlayersFromServer(delta);
  spawnEnemySpits();
  updateProjectiles(delta);
  checkActivity(delta);

  // 1. Move our local player based on keyboard/joystick input (Assuming your core game engine handles this)
  // ... your normal movement logic here ...

  // 2. Stream our location to the server so everyone else can see us!
  streamLocalPosition();
}

function streamLocalPosition() {
  const model = gPlayer.value.model;
  // Send our position to the server every frame so it can broadcast it via the 'tick'
  activeClient.sendPlayerInput(model.position.x, model.position.y, model.position.z, model.rotation.y);
}

// Fire a bullet locally, and tell the server we shot!
export function shootSpitAction(directionVec) {
  if (gPlayer.value.isDead) return;

  // 1. Tell the server
  activeClient.sendSpit(directionVec);

  // 2. Spawn it locally for hit detection
  createProjectile(activeClient.socket.id, gPlayer.value.model.position, directionVec);
}

function createProjectile(ownerId, startPos, directionVec) {
  // Create a simple sphere for the spit
  const geometry = new THREE.SphereGeometry(0.3, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0x88ccff });
  const mesh = new THREE.Mesh(geometry, material);

  // Start it at the alpaca's face
  mesh.position.copy(startPos);
  mesh.position.y += 1.5;

  gScene.value.add(mesh);

  localProjectiles.push({
    mesh: mesh,
    ownerId: ownerId,
    direction: directionVec,
    life: 2.0 // Lives for 2 seconds
  });
}

function spawnEnemySpits() {
  const events = activeClient.serverData.spitEvents;
  if (!events || events.length === 0) return;

  // Process all incoming spits
  while (events.length > 0) {
    const spitData = events.shift();
    const shooter = activePlayers.find(p => p.socketId === spitData.ownerId);

    if (shooter && shooter.socketId !== activeClient.socket.id) {
      createProjectile(shooter.socketId, shooter.model.position, spitData.direction);
    }
  }
}

function updateProjectiles(delta) {
  const speed = 25.0 * delta;

  for (let i = localProjectiles.length - 1; i >= 0; i--) {
    const proj = localProjectiles[i];

    // Move it forward
    proj.mesh.position.x += proj.direction.x * speed;
    proj.mesh.position.z += proj.direction.z * speed;

    proj.life -= delta;

    // Hit Detection (Only calculate hits for bullets WE shot)
    if (proj.ownerId === activeClient.socket.id) {
      for (const target of activePlayers) {
        if (target.socketId !== activeClient.socket.id && !target.isDead) {
          const dist = proj.mesh.position.distanceTo(target.model.position);
          if (dist < 2.0) { // Hit radius

            // WE HIT SOMEONE! Tell the server!
            activeClient.sendSpitHit(target.socketId);

            // Destroy bullet immediately
            proj.life = 0;
            break;
          }
        }
      }
    }

    // Destroy old projectiles
    if (proj.life <= 0) {
      gScene.value.remove(proj.mesh);
      localProjectiles.splice(i, 1);
    }
  }
}

function syncPlayersFromServer(delta) {
  const serverPlayers = gMinigame.value.players;
  if (!serverPlayers) return;

  // 1. Add new players
  serverPlayers.forEach(sPlayer => {
    let localAlpaca = activePlayers.find(p => p.socketId === sPlayer.id);
    if (!localAlpaca && assetsLoaded) {
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

  // 2. Remove disconnected players
  for (let i = activePlayers.length - 1; i >= 0; i--) {
    const localAlpaca = activePlayers[i];
    if (!serverPlayers.find(p => p.id === localAlpaca.socketId)) {
      if (localAlpaca.model) gScene.value.remove(localAlpaca.model);
      activePlayers.splice(i, 1);
    }
  }

  // 3. Update Positions & HP
  for (let i = 0; i < activePlayers.length; i++) {
    const localAlpaca = activePlayers[i];
    if (localAlpaca.isSpawning) continue;

    const serverData = serverPlayers.find(p => p.id === localAlpaca.socketId);
    if (serverData) {

      // Move remote players using Smooth Lerping so it doesn't stutter!
      if (localAlpaca.socketId !== activeClient.socket.id) {
        localAlpaca.model.position.lerp(new THREE.Vector3(serverData.x, serverData.y, serverData.z), delta * 10);

        // Smooth rotation
        const targetRot = serverData.angle;
        let diff = targetRot - localAlpaca.model.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        localAlpaca.model.rotation.y += diff * delta * 10;
      }

      // Handle taking damage
      if (serverData.hp < localAlpaca.hp) {
        spawnFloatingText(localAlpaca.model, '-💔', 'hearts');
      }

      // Handle dying
      if (serverData.isDead && !localAlpaca.isDead) {
        localAlpaca.model.rotation.x = Math.PI / 2; // Tip over dead
        localAlpaca.model.position.y = 0.5;
      }

      localAlpaca.hp = serverData.hp;
      localAlpaca.point = serverData.point;
      localAlpaca.isDead = serverData.isDead;
    }
  }
}

function checkActivity(delta) {
  activeTimer -= delta;
  if (activeTimer <= 0) {
    activeClient.sendActive();
    activeTimer = 1.0;
  }
}

function cleanupSpitRoyal() {
  assetsLoaded = false;
  localProjectiles.forEach(proj => gScene.value.remove(proj.mesh));
  localProjectiles.length = 0;

  activePlayers.forEach(alpaca => {
    if (alpaca !== gPlayer.value) {
      gScene.value.remove(alpaca.model);
    } else {
      alpaca.model.position.set(0, 0, 0);
      alpaca.model.rotation.set(0, 0, 0);
      alpaca.isDead = false;
      alpaca.hp = CONST.HP;
    }
  });
  activePlayers.length = 0;
  gMinigame.value.isGameOver = false;
}