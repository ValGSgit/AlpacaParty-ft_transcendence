import { createItem } from '../core/createObjects.js';
import { useUIManager } from '../core/useUIManager.js';
import { setupPlacement } from './editMode.js';

export function itemShop() {
  const { closeMenus } = useUIManager()

  //TODO: get cost and probably path too from database
  async function buyItem(path) {
    const item = await createItem(path);
    const model = item.model;
    //setBlendshape(model, 'furry', 1.0);
    model.userData.cost = 1;
    closeMenus();
    setupPlacement(model);
  }

  return { buyItem }
}
