import { CONST } from '../config/constants.js'
import * as THREE from 'three'
import { gAlpacas, gPlayer, gUser, gScene } from "../core/globals.js"
import { spawnItems } from "./spawnItems.js"
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { cloneGhost } from '../core/useInput.js'

const { spawnAtRandomPos } = spawnItems()

export function alpacaHandling() {

  const spawnAlpaca = () => {
    const originalAlpaca = gAlpacas.value[0]

    const clonedModel = SkeletonUtils.clone(originalAlpaca.model)
    clonedModel.rotation.set(0, 0, 0)
    clonedModel.quaternion.identity()

    clonedModel.traverse((child) => {
      if (child.isMesh && (child.name.startsWith('UCX_') || child.name === 'Collider')) {
        clonedModel.userData.collider = child
      }
      else if (child.isMesh)
      {
        child.material = child.material.clone();
        child.material.color.set(0xffffff)
      }
    })

    const clonedMixer = new THREE.AnimationMixer(clonedModel)

    const newAlpaca = {
      model: clonedModel,
      mixer: clonedMixer,
      animations: originalAlpaca.animations
    }

    //spawnAtRandomPos(clonedModel)
    const x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    const z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    newAlpaca.model.rotation.y = Math.random() * Math.PI * 2
    const scale = 1 + Math.random() * 0.6
    newAlpaca.model.position.set(x, 0, z)
    newAlpaca.model.scale.set(scale, scale, scale)
    
    gUser.value.selected = newAlpaca.model
    const ghost = cloneGhost(gUser.value.selected)
    gScene.value.add(ghost)
    gScene.value.add(newAlpaca.model)
    gAlpacas.value.push(newAlpaca)
  }

  const switchAlpaca = (obj) => {
    while (obj) {
      for (let i = 0; i < gAlpacas.value.length; ++i) {
        if (obj.id === gAlpacas.value[i].model.id) {
          gPlayer.value = gAlpacas.value[i]
          return
        }
      }
      obj = obj.parent
    }
  }

  return { spawnAlpaca, switchAlpaca }
}