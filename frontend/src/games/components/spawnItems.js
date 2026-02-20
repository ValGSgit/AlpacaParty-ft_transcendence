import { CONST } from '../config/constants.js'
import { gScene, gItems } from '../core/globals.js'

export function spawnItems() {

  const spawnAtRandomPos = (model) => {

    const x = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    const z = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    model.position.set(x, 0, z)

    model.rotation.y = Math.random() * Math.PI * 2

    const scale = 0.7 + Math.random() * 0.3
    model.scale.multiplyScalar(scale)

    gScene.value.add(model)
  }
  return { spawnAtRandomPos }
}

export function addItems(items) {

  gScene.value.add(items)
  gItems.value.push(items)
}
