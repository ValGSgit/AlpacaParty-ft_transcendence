import { gAlpacas, gItems, gUser } from "./globals"


export function printDebug() {
  //console.log("", )
  /*     console.log("gScene.value.selected", gScene.value.selected)
      console.log("gScene.value.selectedGhost", gScene.value.selectedGhost)
      console.log("gScene.value.pause", gScene.value.pause)
      console.log("gScene.value.edit", gScene.value.edit)
      console.log("gScene.value.itemMenu", gScene.value.itemMenu)
      console.log("gScene.value.alpacaMenu", gScene.value.alpacaMenu) */
  console.log("gAlpacas.value.length = ", gAlpacas.value.length)
  console.log("gItems.value.length = ", gItems.value.length)
  //resetValues()
}

function resetValues() {
  gAlpacas.value = [] // clear all Alpaca
  gItems.value = [] // clear all extra Items
  gUser.value.upgrades = 0
  gUser.value.coins = 10
}

export function addDebugCoins() {
  gUser.value.coins += 1000
}

