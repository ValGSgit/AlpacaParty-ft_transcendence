import { gUser, gEngine, gScene } from '../core/globals.js'
import { loadGLTF } from '../core/modelLoader.js'
import { alpacaHandling } from './alpacaHandling.js'
import { CONST } from '../config/constants.js'
import { initWorld } from '../world/initWorld.js'
import * as PRIMITIVES from '../assets/primitives.js'
import * as GRADIENT from "../utils/createGradient.js"

import * as THREE from 'three'

const { spawnAlpaca } = alpacaHandling()

export function useShop() {

  const openShopMenu = () => {
    if (!gUser.value.edit)
      gUser.value.pause = true
  }

  const buyAlpaca = () => {
    console.log(gUser.value.coins)
    console.log(CONST.ALPACA_COST)
    if (gUser.value.coins >= CONST.ALPACA_COST) {
      gUser.value.coins -= CONST.ALPACA_COST
      spawnAlpaca()
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
    if (gUser.value.upgrades === CONST.MAX_UPGRADES) {
      alert("You reached max upgrades!")
    }
    else if (gUser.value.coins < CONST.UPGRADE_COST)
      alert('Not enough coins!')
    else {
      gUser.value.coins -= CONST.UPGRADE_COST
      const floor = gScene.value.floor
      floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
      floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
      gUser.value.upgrades++
    }

  }

  return { openShopMenu, buyAlpaca, addDebugCoins, editModeOn, editModeOff, increaseFarmSize }
}