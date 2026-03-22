import { watch } from 'vue'
import { gUser, gScene, gAlpacas, gItems } from './globals.js'
import { saveGame } from './saveLoadGame.js'


export function watchChanges() {
  // Watch specifically the coins and upgrades properties
  const stopMyWatcher = watch([() => gUser.value.coins, () => gUser.value.upgrades],
    () => {
      saveGame();
    })
  return stopMyWatcher
}