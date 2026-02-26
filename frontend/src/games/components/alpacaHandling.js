import { CONST } from '../config/constants.js'
import * as THREE from 'three'
import { gAlpacas, gPlayer, gScene, gEngine } from "../core/globals.js"
import { cloneGhost } from '../components/editMode.js'
import { usePhysics } from '../core/usePhysics.js'
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
