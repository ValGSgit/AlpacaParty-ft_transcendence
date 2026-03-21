import * as THREE from 'three';
import { gScene, gUser } from '../core/globals.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';

const coinsGroup = new THREE.Group();
let isGroupAdded = false;
let timer = 1

export async function spawnCoins(delta) {
  if (coinsGroup.children.length >= 5 + gUser.value.upgrades)
    return;

  timer -= delta;
  if (timer <= 0) {
    timer = getRandomTimer();
    console.log("Spawn coin!");

    if (!isGroupAdded && gScene.value) {
      gScene.value.add(coinsGroup);
      isGroupAdded = true;
    }
    const tempGroup = await spawnObjectRandomly('/models/coin.glb', 1, 'collectable');
    coinsGroup.add(tempGroup.children[0]);
  }
}

export function spendCoins(cost) {
  gUser.value.coins -= cost
}