import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { setupPlacement } from '../components/editMode.js'
import { CONST } from '../config/constants.js'
import { MATERIALS as MATS } from '../config/materials.js'
import { gAlpacas, gPlayer, gScene } from "../core/globals.js"
import { getRandomPos } from '../utils/randomValues.js'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();

export function alpacaHandling() {

  const moveAlpaca = (player, raycaster) => {
    if (!raycaster && !player.model.target && player.model.readyToMove) {
      player.model.target = getRandomPos()
    }
    else if (raycaster) // doubleClick
    {
      raycaster.ray.intersectPlane(floorPlane, worldPoint)
      player.model.target = worldPoint.clone()
    }
  }

  const switchAlpaca = (obj) => {
    let alpacaToSwitch = findAlpaca(obj)
    if (!alpacaToSwitch) // no alpaca found, walk to obj
      return false
    else if (gPlayer.value === alpacaToSwitch) // open menu for clicking self
      GUI.alpacaMenu = true
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

  const moveToTarget = (alpaca) => {
    if (!alpaca || !alpaca.target) return;

    const speed = CONST.PLAYER_FORWARD_SPEED + alpaca.speedOffset
    const stopDistance = 0.5; // Don't jitter when we arrive

    // 1. Calculate direction vector
    const moveVec = new THREE.Vector3().subVectors(alpaca.target, alpaca.position);
    const distance = moveVec.length();

    if (distance > stopDistance) {
      // 2. Normalize and move
      moveVec.normalize();

      // Check collisions BEFORE moving (optional but recommended)
      const nextX = alpaca.position.x + moveVec.x * speed;
      const nextZ = alpaca.position.z + moveVec.z * speed;

      //if (!checkCollision(alpaca.model, nextX, nextZ)) {
      alpaca.position.x = nextX;
      alpaca.position.z = nextZ;

      // 3. Rotate to face the target smoothly
      const targetRotation = Math.atan2(moveVec.x, moveVec.z);
      alpaca.rotation.y = THREE.MathUtils.lerp(
        alpaca.rotation.y,
        targetRotation,
        0.1
      );
      //}

      alpaca.isMoving = true;
    } else {
      // We arrived!
      alpaca.target = null;
      alpaca.isMoving = false;
      alpaca.readyToMove = false
      setTimeout(() => {
        alpaca.readyToMove = true
      }, Math.random() * 10000)
    }
  };

  return { switchAlpaca, moveAlpaca, spit, moveToTarget }
}

// export function spawnAlpaca(color, name, scale) {
//   const originalAlpaca = gAlpacas[0]
//   const finalColor = color ?? originalAlpaca.model.color
//   const clonedModel = SkeletonUtils.clone(originalAlpaca.model)
//   clonedModel.name = name ?? "NewAlpaca"
//   clonedModel.color = finalColor
//   clonedModel.rotation.set(0, 0, 0)

//   model.quaternion.identity()
//   initFlags(clonedModel)
//   applyNewColor(clonedModel, finalColor)
//   const newAlpaca = createAlpacaData(clonedModel, originalAlpaca.animations, scale)
//   setupPlacement(newAlpaca.model)
//   gAlpacas.push(newAlpaca)
// }

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
        //console.log("Found:", alpaca.name);
        return gAlpacas[i]
      }
    }
    alpaca = alpaca.parent
  }
  return null
}

export function initFlags(model) {
  model.isMoving = false // this one is for doubleClick moving, not wasd
  model.isJumping = false
  model.isDead = 0 // 0 == normal, -1 == dying, 1 == dead
  model.isFalling = false
  model.currentAction = null
  model.target = null
  model.readyToMove = false
}

const createAlpacaData = (model, animations, scale = 1) => {
  model.position.set(0, 0, 0)
  model.scale.set(scale, scale, scale)

  return {
    model: model,
    mixer: new THREE.AnimationMixer(model),
    animations: animations,
    speedOffset: 0,
    rotationOffset: 0
  }
}

const applyNewColor = (model, color) => {
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'Collider') {
        model.userData.collider = child
      } else if (child.name === 'Cylinder') {
        child.material = child.material.clone()
        child.material.color.set(color)
      }
    }
  })
}
