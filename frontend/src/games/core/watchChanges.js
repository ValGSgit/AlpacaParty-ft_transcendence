import { watch } from 'vue'
import { gUser, gScene, gAlpacas, gItems } from './globals.js'
import { saveGame } from './saveLoadGame.js'

export function watchChanges() {
  watch([() => gUser.value.coins, () => gUser.value.upgrades],
    () => {

      saveGame();
    })
}