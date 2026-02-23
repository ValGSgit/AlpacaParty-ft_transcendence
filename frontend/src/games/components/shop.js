import { gUser, gPlayer, gScene } from '../core/globals.js'
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
    editModeOff()
    gScene.value.pause = true
  }

  const buyAlpaca = (color) => {
    if (gUser.value.coins >= CONST.ALPACA_COST) {
      gUser.value.coins -= CONST.ALPACA_COST
      spawnAlpaca(color)
    }
    else
      alert('Not enough coins!')
    gScene.value.pause = false
    gScene.value.alpacaMenu = false
    gScene.value.newAlpaca = false // reset flag
  }

  const addDebugCoins = () => {
    gUser.value.coins++
  }

  const editModeOn = () => {
    gScene.value.edit = true
  }

  const editModeOff = () => {
    gScene.value.edit = false
    gScene.value.selected = null
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
    console.log(newSpeed)
    if (newSpeed < -0.1 || newSpeed > 0.1) // range check
      alert("speed out of range")
    else
      gPlayer.value.speedOffset = newSpeed
  }

  return { openShopMenu, buyAlpaca, addDebugCoins, editModeOn, editModeOff, increaseFarmSize, editLight, alpacaMenuOn, alpacaMenuOff, itemShopOn, itemShopOff, changeSpeed }
}