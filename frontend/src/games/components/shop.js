import { reactive } from 'vue'
import { CONST } from '../config/constants.js'
import { gEngine, gPlayer, gScene, gUI, gUser } from '../core/globals.js'
import { spawnAlpaca } from './alpacaHandling.js'
import { useEditMode } from './editMode.js'

const { editModeOff } = useEditMode()

export function useShop() {

  const openShopMenu = () => {
    editModeOff()
    gUI.pause = true
  }

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

  const closeShop = () => {
    gUser.value.shop = false
    gUI.itemMenu = false
  }

  const editLight = (light) => {
    gUI.lightMenu = true
    if (light === 0)
      return
    gUI.ambientLight.color.set(light)
    gUI.sunLight.color.set(light)
  }

  const alpacaMenuOn = (newAlpaca) => {
    gUI.alpacaMenu = true
    gUI.pause = false
    gUI.newAlpaca = newAlpaca // flag for creating new Alpaca
  }

  const alpacaMenuOff = () => {
    gUI.alpacaMenu = false
    gUI.pause = true
    gUI.newAlpaca = false // flag for creating new Alpaca
  }

  const itemShopOn = () => {
    gUI.itemMenu = true
    gUI.pause = false
  }

  const itemShopOff = () => {
    gUI.itemMenu = false
    gUI.pause = true
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