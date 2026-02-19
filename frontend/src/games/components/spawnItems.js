import { CONST } from '../config/constants.js'
import { loadGLTF } from '../core/modelLoader.js'
import { gEngine, gScene, gPlayer, gAlpacas } from '../core/globals.js'
import * as THREE from 'three'

export function spawnItems() {


  const spawnAlpaca = async () => {
    const newAlpaca = await loadGLTF('/models/Llama.glb')
    const model = newAlpaca.model
    const x = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    const z = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    model.position.set(x, 0, z)
    gScene.value.add(model)
    gAlpacas.value.push(newAlpaca)
  }
  return { spawnAlpaca }
}

