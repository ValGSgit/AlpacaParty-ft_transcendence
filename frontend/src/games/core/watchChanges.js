import { watch } from 'vue'
import { gUser, gScene, gAlpacas, gItems } from './globals.js'
import { saveGame } from './saveLoadGame.js'

// export function watchChanges() {
//   watch([gScene, gUser], ([newScene, newUser], [oldScene, oldUser]) => {

//     //console.log("watch changes!")
//     // if (newScene !== oldScene) {
//     //   console.log('gScene changed!');
//     // }

//     if (newUser !== oldUser) {
//       console.log('gUser changed!');
//     }
//     //saveGame();
//   }, { deep: true })
// }



export function watchChanges() {
  // Watch specifically the coins and upgrades properties
  watch([() => gUser.value.coins, () => gUser.value.upgrades],
    () => {

      saveGame();
    })
}