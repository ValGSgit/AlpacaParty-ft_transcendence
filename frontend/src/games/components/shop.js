import { reactive } from 'vue'
import { CONST } from '../config/constants.js'
import { gPlayer, gScene, gUI, gUser } from '../core/globals.js'
import { spawnAlpaca } from './alpacaHandling.js'


export function useShop() {

  const buyAlpaca = (color) => {
    if (gUser.value.coins >= CONST.ALPACA_COST)
      spawnAlpaca(color, alpacaConfig.name, alpacaConfig.scale)
    else
      alert('Not enough coins!')
    gUI.pause = false
    gUI.alpacaMenu = false
    gUI.newAlpaca = false // reset flag
  }

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

  const changeSpeed = (speed) => {
    const newSpeed = gPlayer.value.speedOffset + speed * 0.1
    if (newSpeed < -0.1 || newSpeed > 0.1) // range check
      alert("speed out of range")
    else
      gPlayer.value.speedOffset = newSpeed
  }

  return { buyAlpaca, increaseFarmSize, changeSpeed }
}

export const alpacaConfig = reactive({
  name: 'New Alpaca',
  color: '#ffffff',
  scale: 1.0
});