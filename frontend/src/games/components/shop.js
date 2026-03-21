import { gUser, gPlayer, gScene, gEngine } from '../core/globals.js'
import { spawnAlpaca } from './alpacaHandling.js'
import { CONST } from '../config/constants.js'
import { reactive } from 'vue'
import { useEditMode } from './editMode.js'

const { editModeOff } = useEditMode()

export function useShop() {

  const openShopMenu = () => {
    editModeOff()
    gScene.value.pause = true
  }

  const buyAlpaca = (color) => {
    if (gUser.value.coins >= CONST.ALPACA_COST)
      spawnAlpaca(color, alpacaConfig.name, alpacaConfig.scale)
    else
      alert('Not enough coins!')
    gScene.value.pause = false
    gScene.value.alpacaMenu = false
    gScene.value.newAlpaca = false // reset flag
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

  const closeShop = () => {
    gUser.value.shop = false
    gScene.value.itemMenu = false
  }

  const editLight = (light) => {
    gScene.value.lightMenu = true
    if (light === 0)
      return
    gScene.value.ambientLight.color.set(light)
    gScene.value.sunLight.color.set(light)
  }

  const alpacaMenuOn = (newAlpaca) => {
    gScene.value.alpacaMenu = true
    gScene.value.pause = false
    gScene.value.newAlpaca = newAlpaca // flag for creating new Alpaca
  }

  const alpacaMenuOff = () => {
    gScene.value.alpacaMenu = false
    gScene.value.pause = true
    gScene.value.newAlpaca = false // flag for creating new Alpaca
  }

  const itemShopOn = () => {
    gScene.value.itemMenu = true
    gScene.value.pause = false
  }

  const itemShopOff = () => {
    gScene.value.itemMenu = false
    gScene.value.pause = true
  }

  const changeSpeed = (speed) => {
    const newSpeed = gPlayer.value.speedOffset + speed * 0.1
    if (newSpeed < -0.1 || newSpeed > 0.1) // range check
      alert("speed out of range")
    else
      gPlayer.value.speedOffset = newSpeed
  }

  const changeCamera = () => {
    if (gScene.value.cameraMode < 3)
      gScene.value.cameraMode++;
    else // reset
    {
      gScene.value.cameraMode = 0
      gEngine.value.camera.position.set(30, 30, 50)
    }
  }

  return { openShopMenu, buyAlpaca, increaseFarmSize, editLight, alpacaMenuOn, alpacaMenuOff, itemShopOn, itemShopOff, changeSpeed, changeCamera, closeShop }
}

export const alpacaConfig = reactive({
  name: 'New Alpaca',
  color: '#ffffff',
  scale: 1.0
});