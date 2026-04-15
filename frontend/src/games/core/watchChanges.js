import { watch } from 'vue'
import { gUser, gUI} from './globals.js'
import { saveGame } from './saveLoadGame.js'


export function watchChanges(setDoF) {
  // Watch specifically the coins and upgrades properties
  const stopGamePlayWatcher = watch([() => gUser.coins, () => gUser.upgrades],
    () => {
      saveGame();
    })

  const stopDoFWatcher = watch(() => gUI.DoF, (newVal) => {
      if (setDoF) setDoF(newVal);
      saveGame(); // Save so the preference is remembered
    }, { immediate: true });

    return () => {stopGamePlayWatcher(); stopDoFWatcher;};
}

