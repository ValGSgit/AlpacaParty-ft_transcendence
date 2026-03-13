import { createItem } from '../core/createObjects.js';
import { useUIManager } from '../core/useUIManager.js';
import { setupPlacement } from './editMode.js';

export function itemShop() {
  const { closeMenus } = useUIManager()

  //TODO: get cost and probably path too from database
  async function buyItem(path) {
    const model = await createItem(path);
    model.userData.cost = 1;
    closeMenus();
    setupPlacement(model);
  }

  return { buyItem }
}
