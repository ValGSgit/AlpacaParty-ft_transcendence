import * as THREE from 'three';
import { MATERIALS as MATS } from '../config/materials.js';
import { gAlpacas, gPlayer, gScene } from "../core/globals.js";
import { useUIManager } from '../core/useUIManager.js';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
const { openAlpacaStats } = useUIManager();

export function alpacaHandling() {

  const setMoveLocation = (model, raycaster) => {
    if (raycaster) // double Click
    {
      raycaster.ray.intersectPlane(floorPlane, worldPoint)
      model.target = worldPoint.clone()
    }
  }

  const switchAlpaca = (obj) => {
    let alpacaToSwitch = findAlpaca(obj)
    if (!alpacaToSwitch) // no alpaca found, walk to obj
      return false
    else if (gPlayer.value === alpacaToSwitch) // open menu for clicking self
      openAlpacaStats();
    else
      gPlayer.value = alpacaToSwitch
    return true
  }

  const spit = () => {
    const origin = new THREE.Vector3().copy(gPlayer.value.model.position)
    let dx = Math.sin(gPlayer.value.model.rotation.y)
    let dz = Math.cos(gPlayer.value.model.rotation.y)
    origin.y += 5 // make it higher
    origin.x += dx * 3 // head offset
    origin.z += dz * 3
    const direction = new THREE.Vector3(dx, 0, dz)
    const near = 0
    const far = 10
    const raycaster = new THREE.Raycaster(origin, direction, near, far)

    const beam = createLaserBeam(origin, direction, far);
    gScene.value.add(beam);

    const targets = gAlpacas.map(a => a.model);
    const hits = raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
      // If we hit something, make the beam shorter so it stops at the target
      const hitDistance = hits[0].distance;
      beam.scale.y = hitDistance / far; // Shrink the beam to the hit point
      const hitAlpaca = findAlpaca(hits[0].object)
      hitAlpaca.model.isDead = -1 // being hit
    }

    setTimeout(() => {
      gScene.value.remove(beam);
      beam.geometry.dispose();
    }, 200);
  }

  return { switchAlpaca, setMoveLocation, spit }
}

// -----------------------------------------------------------------------------------------------

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


