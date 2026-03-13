import { gAlpacas, gCoins, gCollidable, gEditables, gItems, gUser } from "./globals";

export function printDebug() {
  console.log("gAlpacas.length = ", gAlpacas.length)
  console.log("gItems.length = ", gItems.length)
  console.log("gCoins.length = ", gCoins.length)
  console.log("gCollidable.length = ", gCollidable.length)
  console.log("gEditables.length = ", gEditables.length)
  //resetValues()
}

function resetValues() {
  // clear all
  gAlpacas.length = 0;
  gItems.length = 0;
  gCoins.length = 0;
  gCollidable.length = 0;
  gEditables.length = 0;

  gUser.value.upgrades = 0
  gUser.value.coins = 10
}

export function addDebugCoins() {
  gUser.value.coins += 1000
}

