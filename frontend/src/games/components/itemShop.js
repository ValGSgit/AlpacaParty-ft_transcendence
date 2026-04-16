import { createDecoration, createItem } from '../core/createObjects.js';
import { useUIManager } from '../core/useUIManager.js';
import { setupPlacement } from './editMode.js';
import { checkCoinsPrice } from './upgradeFarm.js';

export function itemShop() {
  const { closeMenus } = useUIManager()

  async function buyItem(selectedItem) {
    if (!checkCoinsPrice(selectedItem.cost)) return;
    const item = await (selectedItem.type == 'item'
      ? createItem(selectedItem.path)
      : createDecoration(selectedItem.path));
    const model = item.model;
    model.userData.cost = selectedItem.cost;

    closeMenus();
    setupPlacement(model);
  }

  return { buyItem }
}

