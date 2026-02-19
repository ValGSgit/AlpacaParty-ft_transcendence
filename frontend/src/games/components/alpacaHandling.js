import * as THREE from 'three'
import { gAlpacas, gPlayer } from "../core/globals.js"
import { spawnItems } from "./spawnItems.js"
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

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
    })

    const clonedMixer = new THREE.AnimationMixer(clonedModel)

    const newAlpaca = {
      model: clonedModel,
      mixer: clonedMixer,
      animations: originalAlpaca.animations
    }

    spawnAtRandomPos(clonedModel)
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