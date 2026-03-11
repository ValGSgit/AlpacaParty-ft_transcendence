import { setupPlacement } from '../components/editMode.js'
import { useShop } from './shop.js'

export function spawnItems() {
  const { closeShop } = useShop()

  async function spawnShopItem() {
    const { model } = spawnItem('/models/tree.glb')
    model.name = "tree"

    setupPlacement(model)
    closeShop()
  }

  return { spawnShopItem }
}
