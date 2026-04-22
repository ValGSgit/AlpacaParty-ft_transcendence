import { gAlpacas, gCollectables, gCollidables, gEditables, gItems, gUser, gMinigame } from "./globals";

export function printDebug() {
  if (gAlpacas)
    console.log("gAlpacas.length = ", gAlpacas.length)
  if (gItems)
    console.log("gItems.length = ", gItems.length)
  if (gCollectables)
    console.log("gCollectables.length = ", gCollectables.length)
  if (gCollidables)
    console.log("gCollidables.length = ", gCollidables.length)
  if (gEditables)
    console.log("gEditables.length = ", gEditables.length)
  if (gMinigame)
    console.log("gMinigame = ", gMinigame.value)
  //resetValues()
}

function resetValues() {
  // clear all
  gAlpacas.length = 0;
  gItems.length = 0;
  gCollectables.length = 0;
  gCollidables.length = 0;
  gEditables.length = 0;

  gUser.value.upgrades = 0
  gUser.value.coins = 10
}

export function addDebugCoins() {
  gUser.value.coins += 1000
}

