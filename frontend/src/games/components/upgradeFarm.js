import { CONST } from '../config/constants.js';
import { shopItems } from '../core/entities/Item.js';
import { gScene, gUser } from '../core/globals.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';

const UPGRADE_COST = [25, 50, 100, 250, 500];
const HERDSIZE_COST = [5, 15, 25, 50, 100];
const HERDSIZES = [3, 5, 7, 10, 15, 20];

export function upgradeFarm() {

  const increaseFarmSize = async (level) => {
    const cost = getUpgradeCost(level);

    if (cost === "Max" || level >= UPGRADE_COST.length) {
      alert("You reached max upgrades!");
      return;
    }
    if (!checkCoinsPrice(cost)) return;

    const floor = gScene.value.floor
    gUser.value.coins -= cost;
    gUser.value.upgrades++;
    floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
    floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS

    const grass = shopItems.find(item => item.name === 'Grass');
    const newGrassGroup = await spawnObjectRandomly(grass, 10, true);
    gScene.value.add(newGrassGroup);

    const stones = shopItems.find(item => item.name === 'Stones');
    const stonesGroup = await spawnObjectRandomly(stones, 3, true);
    gScene.value.add(stonesGroup);

    const tree = shopItems.find(item => item.name === 'Tree');
    const treeGroup = await spawnObjectRandomly(tree, 2, true);
    gScene.value.add(treeGroup);
  }
  return { increaseFarmSize }
}

export function getUpgradeCost(level) {
  if (level >= UPGRADE_COST.length) return "Max";
  return UPGRADE_COST[level];
}

export function checkCoinsPrice(cost) {
  if (gUser.value.coins < cost) {
    alert('Not enough coins!');
    return false;
  }
  return true;
}
