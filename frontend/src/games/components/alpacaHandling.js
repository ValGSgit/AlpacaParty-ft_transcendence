import { CONST } from '../config/constants.js'
import * as THREE from 'three'
import { gAlpacas, gPlayer, gUser, gScene } from "../core/globals.js"
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { cloneGhost } from '../core/useInput.js'
import { usePhysics } from '../core/usePhysics.js'
import { handleAnimation } from '../core/useAnimation.js'

export function alpacaHandling() {
  const { checkCollision } = usePhysics()

  const spawnAlpaca = (color, name, scale) => {
    const originalAlpaca = gAlpacas.value[0]
    if (color === undefined)
      color = originalAlpaca.model.color
    const clonedModel = SkeletonUtils.clone(originalAlpaca.model)
    clonedModel.rotation.set(0, 0, 0)
    clonedModel.quaternion.identity()
    clonedModel.name = (name === undefined) ? "NewAlpaca" : name
    clonedModel.color = color

    clonedModel.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'Collider')
          clonedModel.userData.collider = child
        else {
          if (child.name === 'Cylinder') // 'Cylinder' is the alpacasbody name
          {
            child.material = child.material.clone();
            child.material.color.set(color)
          }
        }
      }
    })
    const clonedMixer = new THREE.AnimationMixer(clonedModel)

    const newAlpaca = {
      model: clonedModel,
      mixer: clonedMixer,
      animations: originalAlpaca.animations,
      speedOffset: 0,
      rotationOffset: 0
    }

    if (scale === undefined)
      scale = 1
    newAlpaca.model.position.set(0, 0, 0)
    newAlpaca.model.scale.set(scale, scale, scale)

    gScene.value.selected = newAlpaca.model
    const ghost = cloneGhost(gScene.value.selected)
    gScene.value.add(ghost)
    gScene.value.add(newAlpaca.model)
    gAlpacas.value.push(newAlpaca)
  }

  const moveAlpaca = (raycaster) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const worldPoint = new THREE.Vector3();
    if (!raycaster) {
      // random x z for AI
      worldPoint.x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
      worldPoint.y = 0
      worldPoint.z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    }
    else
      raycaster.ray.intersectPlane(plane, worldPoint)
    // teleport for the moment, need improvement
    const distance = Math.sqrt(worldPoint.x * worldPoint.x + worldPoint.z * worldPoint.z)
    const withinBounds = distance < CONST.MAX_MOVE_RADIUS
    if (withinBounds)
      checkCollision(gPlayer.value.model, worldPoint.x, worldPoint.z)
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

  return { spawnAlpaca, switchAlpaca, moveAlpaca, split }
}