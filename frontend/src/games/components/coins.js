import { gUser } from '../core/globals.js';

export function spendCoins(cost) {
  gUser.value.coins -= cost
}

// export async function spawnCoins() {

// }