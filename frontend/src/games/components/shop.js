import { gUser } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { alpacaHandling } from './alpacaHandling.js'

const { spawnAlpaca } = alpacaHandling()

export function useShop() {

  const openShopMenu = () => {
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
  return { openShopMenu, buyAlpaca, addDebugCoins }
}