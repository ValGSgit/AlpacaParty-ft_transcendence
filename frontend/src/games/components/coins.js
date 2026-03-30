import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { gScene, gUser } from '../core/globals.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';

const coinsGroup = new THREE.Group();
let isGroupAdded = false;
let timer = 1

async function spawnCoin() {
  timer = getRandomTimer();

  if (!isGroupAdded && gScene.value) {
    gScene.value.add(coinsGroup);
    isGroupAdded = true;
  }
  const tempGroup = await spawnObjectRandomly('/models/coin.glb', 1, 'collectable');
  if (tempGroup && tempGroup.children.length > 0) {
    coinsGroup.add(tempGroup.children[0]);
  }
}

export async function updateCoins(delta) {
  const spinSpeed = 1.5;
  coinsGroup.children.forEach((coin) => {
    coin.rotation.y += spinSpeed * delta;
  });

  if (coinsGroup.children.length <= CONST.MAX_COINS) {
    timer -= delta;
    if (timer <= 0) {
      await spawnCoin();
    }
  }
}

export function spendCoins(cost) {
  gUser.value.coins -= cost;
}

export function addCoins(amount) {
  gUser.value.coins += amount;
}