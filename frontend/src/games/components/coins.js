import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { collectables } from '../core/entities/Collectable.js';
import { gMinigame, gScene, gUser } from '../core/globals.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';

const coinsGroup = new THREE.Group();
let isGroupAdded = false;
let timer = 1
const coin = collectables.find(item => item.name === 'Coin');

async function spawnCoin() {
  timer = getRandomTimer();

  if (!isGroupAdded && gScene.value) {
    gScene.value.add(coinsGroup);
    isGroupAdded = true;
  }
  const tempGroup = await spawnObjectRandomly(coin, 1);
  if (tempGroup && tempGroup.children.length > 0) {
    coinsGroup.add(tempGroup.children[0]);
  }
}

export async function updateCoins(delta) {
  if (gMinigame.mode !== 0) return;

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
  gUser.value.coins -= cost
}

export function clearCoins() {
  coinsGroup.children.length = 0
  isGroupAdded = false
}

export function addCoins(amount) {
  gUser.value.coins += amount;
}