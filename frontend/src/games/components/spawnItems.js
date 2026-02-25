import { CONST } from '../config/constants.js'
import { gScene, gItems, gUser, gPlayer } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { cloneGhost } from '../core/useInput.js'

export function spawnItems() {

  async function spawnShopItem() {
    const { model } = await loadGLTF('/models/tree.glb')
    model.name = "tree"

    const x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    const z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
    model.rotation.y = Math.random() * Math.PI * 2
    //const scale = 1 + Math.random() * 0.6
    const scale = 0.3 // very small for jump testing
    model.position.set(x, 4.5 * scale, z) // remove y later for non-tree objs
    model.scale.set(scale, scale, scale)

    gScene.value.selected = model
    const ghost = cloneGhost(gScene.value.selected)
    gScene.value.add(ghost)

    gUser.value.shop = false
    gScene.value.itemMenu = false

    gScene.value.add(model)
    gItems.value.push(model)
  }

  const spawnAtRandomPos = (model) => {

    const x = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    const z = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    model.position.set(x, 0, z)

    model.rotation.y = Math.random() * Math.PI * 2

    const scale = 0.7 + Math.random() * 0.3
    model.scale.multiplyScalar(scale)

    gScene.value.add(model)
  }
  return { spawnAtRandomPos, spawnShopItem }
}

export function addItems(items) {

  gScene.value.add(items)
  gItems.value.push(items)
}
