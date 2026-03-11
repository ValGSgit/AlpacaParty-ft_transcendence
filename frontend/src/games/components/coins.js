import { gUser } from '../core/globals.js';
// import { loadGLTF } from '../core/modelLoader.js';

export function spendCoins(cost) {
  gUser.value.coins -= cost
}

// export async function spawnCoins() {
//   const { model } = await loadGLTF('/models/coin.gltf');
  
// }