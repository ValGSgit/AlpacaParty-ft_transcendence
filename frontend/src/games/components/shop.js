import { gUser, gEngine } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { alpacaHandling } from './alpacaHandling.js'
import { CONST } from '../config/constants.js'

const { spawnAlpaca } = alpacaHandling()

export function useShop() {

  const openShopMenu = () => {
    if (!gUser.value.edit)
      gUser.value.pause = true
  }

  const buyAlpaca = () => {
    if (gUser.value.coins > 0) {
      spawnAlpaca()
      gUser.value.coins--
    }
    else
      alert('Not enough coins!')
    gUser.value.pause = false
  }

  const addDebugCoins = () => {
    gUser.value.coins++
  }

  const editModeOn = () => {
    gUser.value.edit = true
  }

  const editModeOff = () => {
    gUser.value.edit = false
    gUser.value.selected = null
  }

  const increaseFarmSize = () => {
    //CONST.FLOOR_RADIUS++
    //not working now, need to change it to gUser instead of CONST
  }

  return { openShopMenu, buyAlpaca, addDebugCoins, editModeOn, editModeOff, increaseFarmSize}
}