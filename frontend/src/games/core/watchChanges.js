import { watch } from 'vue';
import { gUI, gUser } from './globals.js';
import { saveGame } from './saveLoadGame.js';


export function watchChanges(setDoF) {
  // Watch specifically the coins and upgrades properties
  const stopGamePlayWatcher = watch([() => gUser.value.coins, () => gUser.value.upgrades],
    () => {
      saveGame();
    })

  const stopDoFWatcher = watch(() => gUI.DoF, (newVal) => {
    if (setDoF) setDoF(newVal);
  }, { immediate: true });

  return () => { stopGamePlayWatcher(); stopDoFWatcher; };
}

