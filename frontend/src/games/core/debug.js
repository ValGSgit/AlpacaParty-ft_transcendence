import { gAlpacas, gCollectables, gCollidables, gDecorations, gEditables, gItems, gUser } from "./globals";

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
  if (gUser) {
    console.log("gUser = ", gUser.value)
  }
  resetValues()
}

//clear all
function resetValues() {
  //gAlpacas.length = 0;
  gUser.value.coins = 0;
  gItems.length = 0;
  gDecorations.length = 0;
  gCollectables.length = 0;
  gCollidables.length = 0;
  gEditables.length = 0;

  gUser.value.upgrades = 0
  gUser.value.coins = 10
}

export function addDebugCoins() {
  gUser.value.coins += 1000
}

