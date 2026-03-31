import { CONST } from '../config/constants.js';
import { gScene, gUser } from '../core/globals.js';

export const UPGRADE_COST = [25, 50, 100, 250, 500];

export function upgradeFarm() {

  const increaseFarmSize = (level) => {
    if (!checkCoinsPrice(getUpgradeCost(level))) return;

    if (level === CONST.MAX_UPGRADES) {
      alert("You reached max upgrades!")
    }
    else {
      const floor = gScene.value.floor

      gUser.value.coins -=
        gUser.value.upgrades++
      floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
      floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
    }
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