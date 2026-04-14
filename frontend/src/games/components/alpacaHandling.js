import * as THREE from 'three';
import { MATERIALS as MATS } from '../config/materials.js';
import { gAlpacas, gPlayer, gScene, gUser } from "../core/globals.js";
import { useUIManager } from '../core/useUIManager.js';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
const { openAlpacaStats } = useUIManager();
const activeSpits = []; // Keep track of projectiles in flight

export function alpacaHandling() {

  const setMoveLocation = (raycaster) => {
    if (!raycaster.ray.intersectPlane(floorPlane, worldPoint)) return;
    if (!gPlayer.value) return;
    gPlayer.value.target = worldPoint.clone()
    gPlayer.value.isAutoMoving = true;
  }

  const switchAlpaca = (obj, raycaster) => {
    let alpacaToSwitch = findAlpaca(obj)
    if (!alpacaToSwitch && raycaster) {
      setMoveLocation(raycaster)
    }
    else if (gPlayer.value === alpacaToSwitch) // open menu for clicking self
      openAlpacaStats();
    else
      gPlayer.value = alpacaToSwitch
    return true
  }

  const makeSpit = (alpaca, targetPoint) => {
    if (alpaca.isDead)
      return
    const origin = new THREE.Vector3().copy(alpaca.model.position);
    let dx = Math.sin(alpaca.model.rotation.y);
    let dz = Math.cos(alpaca.model.rotation.y);

    // Setup initial position
    origin.y += 5;
    origin.x += dx * 3;
    origin.z += dz * 3;
    let direction
    if (targetPoint) // shooting a specific spot, for AR glasses atm
    {
        direction = new THREE.Vector3()
        .subVectors(targetPoint, origin)
        .normalize();
    }
    else
      direction = new THREE.Vector3(dx, -0.4, dz).normalize();
    const beam = createLaserBeam(origin, direction, 1); // Start small
    gScene.value.add(beam);

    // Add to our tracking array instead of doing hit logic here
    activeSpits.push({
      owner: alpaca, // the owner of the spit
      mesh: beam,
      direction: direction,
      currentPos: origin,
      distanceTraveled: 0,
      maxDistance: 15,
      speed: 0.5 // Adjust this to make it slower or faster
    });
  };

  const updateSpits = () => {

    for (let i = activeSpits.length - 1; i >= 0; i--) {
      const s = activeSpits[i];

      // 1. Move the projectile forward
      const step = s.direction.clone().multiplyScalar(s.speed);
      s.currentPos.add(step);
      s.mesh.position.copy(s.currentPos);
      s.distanceTraveled += s.speed;

      // 2. Raycast from current position to check for hits in this "frame"
      const raycaster = new THREE.Raycaster(s.currentPos, s.direction, 0, s.speed);
      // In multiplayer, we also need to check hits against remote players!
      // Remote players are added straight to gScene, so let's just raycast the whole scene 
      // (or you can push remote players to gAlpacas temporarily)
      const targets = gUser.value.gameMode === 2 ? gScene.value.children : gAlpacas.map(a => a.model);
      const hits = raycaster.intersectObjects(targets, true);

      if (hits.length > 0 || s.distanceTraveled > s.maxDistance) {
        
        if (hits.length > 0) {
          if (gUser.value.gameMode !== 2) {
            // --- SINGLE PLAYER LOGIC ---
            const hitAlpaca = findAlpaca(hits[0].object);
            if (hitAlpaca) hitAlpaca.beingHit(s.owner);
          } else {
            // --- MULTIPLAYER LOGIC ---
            // Only the person who fired the laser is allowed to tell the server it hit!
            if (s.owner === gPlayer.value && window.onlineClient) {
               
               // Traverse up the 3D object to find the tag we will place on remote players
               let obj = hits[0].object;
               while (obj && !obj.userData.networkId) obj = obj.parent;
               
               if (obj && obj.userData.networkId && obj.userData.networkId !== window.onlineClient.localPlayerId) {
                 // We hit a remote player! Tell the server.
                 window.onlineClient.socket.emit('spit_hit', { targetId: obj.userData.networkId });
               }
            }
          }
        }

        // Cleanup the visual laser
        gScene.value.remove(s.mesh);
        s.mesh.geometry.dispose();
        activeSpits.splice(i, 1);
      }
    }
  };

  return { switchAlpaca, makeSpit, updateSpits }
}

const createLaserBeam = (origin, direction, length) => {
  const geo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
  geo.translate(0, length / 2, 0);
  const laser = new THREE.Mesh(geo, MATS.spit);
  laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  laser.position.copy(origin);

  return laser;
};

const findAlpaca = (alpaca) => {
  while (alpaca) {
    for (let i = 0; i < gAlpacas.length; ++i) {
      if (alpaca.id === gAlpacas[i].model.id) {
        return gAlpacas[i]
      }
    }
    alpaca = alpaca.parent
  }
  return null
}