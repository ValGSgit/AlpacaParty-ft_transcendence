import { CONST } from '../config/constants.js'
import * as THREE from 'three'
import { gAlpacas, gPlayer, gScene, gEngine } from "../core/globals.js"
import { cloneGhost } from '../components/editMode.js'
import { usePhysics } from '../core/usePhysics.js'
import { handleAnimation } from '../core/useAnimation.js'
import { cloneModel } from '../utils/cloneModel.js'
import { setupPlacement } from '../components/editMode.js'

export function alpacaHandling() {
  const { checkCollision } = usePhysics()

  const createAlpacaData = (model, animations, scale) => {
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
  const spawnAlpaca = (color, name, scale) => {
    const originalAlpaca = gAlpacas.value[0]
    color = color ?? originalAlpaca.model.color

    const clonedModel = cloneModel(originalAlpaca.model, color, name)
    const newAlpaca = createAlpacaData(clonedModel, originalAlpaca.animations, scale)
    setupPlacement(newAlpaca.model)
    gAlpacas.value.push(newAlpaca)
  }

  const moveAlpaca = (player, raycaster) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const worldPoint = new THREE.Vector3();
    if (!raycaster && !player.target && player.readyToMove) {
      // random x z for AI
      worldPoint.x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
      worldPoint.y = 0
      worldPoint.z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
      player.target = worldPoint
    }
    else if (raycaster) // doubleClick
    {
      raycaster.ray.intersectPlane(plane, worldPoint)
      player.target = worldPoint
    }
  }

  const switchAlpaca = (obj) => {
    let alpacaToSwitch = findAlpaca(obj)
    if (!alpacaToSwitch) // no alpaca found, walk to obj
      return false
    else if (gPlayer.value === alpacaToSwitch) // open menu for clicking self
      gScene.value.alpacaMenu = true
    else
      gPlayer.value = alpacaToSwitch
    return true
  }

  const createLaserBeam = (origin, direction, length) => {
  // 1. Create a thin cylinder
  const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
  
  // 2. Make it glow with Emissive
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.8
  });

  const laser = new THREE.Mesh(geometry, material);

  // 3. Position and Rotate the laser
  // Cylinders are created vertically, so we need to tilt it to match the ray
  laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  
  // Position it halfway between the origin and the end of the ray
  const middlePoint = new THREE.Vector3().copy(direction).multiplyScalar(length / 2);
  laser.position.copy(origin).add(middlePoint);

  return laser;
  };

  const findAlpaca = (alpaca) =>{
    while (alpaca) {
      for (let i = 0; i < gAlpacas.value.length; ++i) {
        if (alpaca.id === gAlpacas.value[i].model.id) {
          //console.log("Found:", alpaca.name);
          return gAlpacas.value[i]
        }
      }
      alpaca = alpaca.parent
    }
    return null
  }

  const split = () => {
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

    // --- RENDERING THE SPLIT ---
    const beam = createLaserBeam(origin, direction, far);
    gScene.value.add(beam);

    // --- CHECKING FOR HITS ---
    const targets = gAlpacas.value.map(a => a.model);
    const hits = raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
    // If we hit something, make the beam shorter so it stops at the target
    const hitDistance = hits[0].distance;
    beam.scale.y = hitDistance / far; // Shrink the beam to the hit point
    const hitAlpaca = findAlpaca(hits[0].object)
    hitAlpaca.model.isDead = -1 // being hit
  }

  // Fade out and remove the beam
  setTimeout(() => {
    gScene.value.remove(beam);
  }, 200); // Quick flash effect
  }

  const moveToTarget = (alpaca, delta) => {
  if (!alpaca || !alpaca.target) return;

  const speed = CONST.PLAYER_FORWARD_SPEED + gPlayer.value.speedOffset
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

  return { spawnAlpaca, switchAlpaca, moveAlpaca, split, moveToTarget }
}
