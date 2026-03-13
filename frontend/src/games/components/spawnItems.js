import { gItems } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { setupPlacement } from '../components/editMode.js'
import { useShop } from './shop.js'

export function spawnItems() {
  const { closeShop } = useShop()

  async function spawnShopItem() {
    const { model } = await loadGLTF('/models/tree.glb')
    model.name = "tree"
    model.position.y = 4.5 // match the y-offset used by randomly spawned trees (model pivot is below ground)

    setupPlacement(model)
    closeShop()
    gItems.value.push(model)
  }

  return { spawnShopItem }
}
