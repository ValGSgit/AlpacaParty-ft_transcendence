import { createItem } from '../core/createObjects.js';
import { useUIManager } from '../core/useUIManager.js';
import { setupPlacement } from './editMode.js';

export function buyItems() {
  const { closeMenus } = useUIManager()

  async function spawnShopItem(path) {
    const model = await createItem(path);
    closeMenus();
    setupPlacement(model);
  }

  return { spawnShopItem }
}
