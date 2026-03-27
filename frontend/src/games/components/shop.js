import { CONST } from '../config/constants.js';
import { gScene, gUser } from '../core/globals.js';


export function useShop() {

  const increaseFarmSize = () => {
    if (!checkCoins(CONST.UPGRADE_COST)) return;

    if (gUser.value.upgrades === CONST.MAX_UPGRADES) {
      alert("You reached max upgrades!")
    }
    else {
      const floor = gScene.value.floor

      gUser.value.coins -= CONST.UPGRADE_COST
      gUser.value.upgrades++
      floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
      floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
    }
  }

  return { increaseFarmSize }
}

export function checkCoinsPrice(cost) {
  if (gUser.value.coins < cost) {
    alert('Not enough coins!');
    return false;
  }
  return true;
}