import { gItems } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { setupPlacement } from '../components/editMode.js'
import { useShop } from './shop.js'

export function spawnItems() {
  const { closeShop } = useShop()

  async function spawnShopItem() {
    const { model } = await loadGLTF('/models/tree.glb')
    model.name = "tree"

    setupPlacement(model)
    closeShop()
    gItems.value.push(model)
  }

  return { spawnShopItem }
}
