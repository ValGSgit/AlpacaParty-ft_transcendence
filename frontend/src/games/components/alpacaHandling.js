import * as THREE from 'three';
import { MATERIALS as MATS } from '../config/materials.js';
import { gAlpacas, gPlayer, gScene } from "../core/globals.js";
import { useUIManager } from '../core/useUIManager.js';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
const { openAlpacaStats } = useUIManager();
const activeSpits = []; // Keep track of projectiles in flight

export function alpacaHandling() {

  const setMoveLocation = (raycaster) => {
    raycaster.ray.intersectPlane(floorPlane, worldPoint)
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

  const makeSpit = (alpaca) => {
    if (alpaca.isDead)
      return
    const origin = new THREE.Vector3().copy(alpaca.model.position);
    let dx = Math.sin(alpaca.model.rotation.y);
    let dz = Math.cos(alpaca.model.rotation.y);
    
    // Setup initial position
    origin.y += 5;
    origin.x += dx * 3;
    origin.z += dz * 3;
    
    const direction = new THREE.Vector3(dx, -0.4, dz).normalize();
    const beam = createLaserBeam(origin, direction, 1); // Start small
    gScene.value.add(beam);

    // Add to our tracking array instead of doing hit logic here
    activeSpits.push({
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
        const targets = gAlpacas.map(a => a.model);
        const hits = raycaster.intersectObjects(targets, true);

        if (hits.length > 0 || s.distanceTraveled > s.maxDistance) {
            // Logic for hitting an alpaca
            if (hits.length > 0) {
                const hitAlpaca = findAlpaca(hits[0].object);
                hitAlpaca.beingHit()
            }

            // Cleanup
            gScene.value.remove(s.mesh);
            s.mesh.geometry.dispose();
            activeSpits.splice(i, 1);
        }
    }
  };

  return { switchAlpaca, makeSpit , updateSpits }
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


