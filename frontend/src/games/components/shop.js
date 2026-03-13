import { reactive } from 'vue'
import { CONST } from '../config/constants.js'
import { gScene, gUser } from '../core/globals.js'


export function useShop() {

  const increaseFarmSize = () => {
    if (gUser.value.upgrades === CONST.MAX_UPGRADES) {
      alert("You reached max upgrades!")
    }
    else if (gUser.value.coins < CONST.UPGRADE_COST)
      alert('Not enough coins!')
    else {
      gUser.value.coins -= CONST.UPGRADE_COST
      const floor = gScene.value.floor
      gUser.value.upgrades++
      floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
      floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
    }
  }

  return { increaseFarmSize }
}
