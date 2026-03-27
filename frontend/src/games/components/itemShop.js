import { createDecoration, createItem } from '../core/createObjects.js';
import { useUIManager } from '../core/useUIManager.js';
import { setupPlacement } from './editMode.js';
import { checkCoinsPrice } from './shop.js';

const shopItems = [
  { name: 'Barn', path: '/models/barn.glb', icon: '/icons/Barn.png', cost: 100, type: 'item' },
  { name: 'Barrel', path: '/models/barrel.glb', icon: '/icons/Barrel.png', cost: 10, type: 'item' },
  { name: 'Fence', path: '/models/fence.glb', icon: '/icons/Fence.png', cost: 10, type: 'item' },
  { name: 'Fence Gate', path: '/models/fenceGate.glb', icon: '/icons/Fence Gate.png', cost: 20, type: 'item' },
  { name: 'Fence Pole', path: '/models/fencePole.glb', icon: '/icons/Fence Pole.png', cost: 5, type: 'item' },
  { name: 'Grass', path: '/models/grass.glb', icon: '/icons/Grass.png', cost: 1, type: 'decoration' },
  { name: 'Hay', path: '/models/hay.glb', icon: '/icons/Hay.png', cost: 25, type: 'item' },
  { name: 'Manger', path: '/models/manger.glb', icon: '/icons/Manger.png', cost: 50, type: 'item' },
  { name: 'Stones', path: '/models/stones.glb', icon: '/icons/Stones.png', cost: 2, type: 'decoration' },
  { name: 'Tree', path: '/models/tree.glb', icon: '/icons/Tree.png', cost: 10, type: 'item' },
  { name: 'Water Trough', path: '/models/waterTrough.glb', icon: '/icons/Water Trough.png', cost: 50, type: 'item' },
  { name: 'Wheat', path: '/models/wheat.glb', icon: '/icons/Wheat.png', cost: 25, type: 'decoration' },
]

export function itemShop() {
  const { closeMenus } = useUIManager()

  async function buyItem(selectedItem) {
    if (!checkCoinsPrice(selectedItem.cost)) return;

    console.log(selectedItem);
    const item = await (selectedItem.type == 'item'
      ? createItem(selectedItem.path)
      : createDecoration(selectedItem.path));
    const model = item.model;
    model.userData.cost = selectedItem.cost;

    closeMenus();
    setupPlacement(model);
  }

  return { buyItem, shopItems }
}

// Test for alpacas
// setBlendshape(model, 'furry', 1.0);
