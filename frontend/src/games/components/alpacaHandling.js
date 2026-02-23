import { CONST } from '../config/constants.js'
import * as THREE from 'three'
import { gAlpacas, gPlayer, gUser, gScene } from "../core/globals.js"
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { cloneGhost } from '../core/useInput.js'
import { usePhysics } from '../core/usePhysics.js'

export function alpacaHandling() {
  const { checkCollision } = usePhysics()

  const spawnAlpaca = (color) => {
    const originalAlpaca = gAlpacas.value[0]
    if (color === undefined)
      color = 0x000000 // black for default
    const clonedModel = SkeletonUtils.clone(originalAlpaca.model)
    clonedModel.rotation.set(0, 0, 0)
    clonedModel.quaternion.identity()

    clonedModel.traverse((child) => {
      if (child.isMesh && (child.name.startsWith('UCX_') || child.name === 'Collider')) {
        clonedModel.userData.collider = child
      }
      if (child.isMesh && child.name === 'Cylinder')
      {
        child.material = child.material.clone();
        child.material.color.set(color)
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

    const x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    const z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    newAlpaca.model.rotation.y = Math.random() * Math.PI * 2
    const scale = 1 + Math.random() * 0.6
    newAlpaca.model.position.set(x, 0, z)
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
    if (!raycaster)
    {
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
    while (obj) {
      for (let i = 0; i < gAlpacas.value.length; ++i) {
        if (obj.id === gAlpacas.value[i].model.id) {
          if (gPlayer.value === gAlpacas.value[i]) // open menu for clicking self
            gScene.value.alpacaMenu = true
          else
            gPlayer.value = gAlpacas.value[i]
          return true
        }
      }
      obj = obj.parent
    }
    //hit no alpaca, walk to obj
    return false
  }

  return { spawnAlpaca, switchAlpaca, moveAlpaca }
}