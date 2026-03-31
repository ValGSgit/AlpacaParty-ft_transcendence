import { watch } from 'vue'
import { gUser, gScene, gAlpacas, gItems } from './globals.js'
import { saveGame } from './saveLoadGame.js'

let _saveTimer = null

function debouncedSave() {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => saveGame(), 2000)
}

export function watchChanges() {
  // Debounce saves — coins increment on every pickup so we batch changes
  // and only write to the server after 2 s of inactivity.
  const stopMyWatcher = watch(
    [() => gUser.value.coins, () => gUser.value.upgrades],
    debouncedSave,
  )
  return stopMyWatcher
}