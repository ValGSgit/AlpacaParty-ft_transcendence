import * as THREE from 'three'
import { createAlpaca, createItem } from '../core/createObjects.js'
import { gPlayer } from '../core/globals.js'
import { spawnObjectRandomly } from '../utils/spawnRandomly.js'
import { loadGameData } from './dataLoader.js'
import { setupEnvironment } from './sceneBuilder.js'

export async function initWorld(scene, isAuthenticated = false) {
  setupEnvironment(scene)

  let user = null
  if (isAuthenticated) {
    user = await loadGameData()
  } else {
    console.log('User not logged in, starting fresh.')
  }
  await initAlpacas(scene, user)
  await initItems(scene, user?.items)
}

export async function initAlpacas(scene, user) {
  const alpacaGroup = new THREE.Group()
  const alpacasToLoad = (user?.alpacas?.length > 0) ? user.alpacas : [null];

  for (const savedData of alpacasToLoad) {
    let newAlpaca;
    if (savedData) {
      newAlpaca = await createAlpaca(
        savedData.name,
        savedData.color,
        savedData.position,
        savedData.rotation,
        savedData.scale,
      );
      newAlpaca.speedOffset = savedData.speedOffset;
      newAlpaca.rotationOffset = savedData.rotationOffset;
      newAlpaca.age = savedData.age;
      newAlpaca.aliveTime = savedData.aliveTime;
    } else {
      newAlpaca = await createAlpaca();
    }
    if (!gPlayer.value) gPlayer.value = newAlpaca;
    alpacaGroup.add(newAlpaca.model)
  }
  scene.add(alpacaGroup);
}

export async function initItems(scene, savedItems) {
  let itemsGroup = new THREE.Group();

  if (savedItems && savedItems.length > 0) {
    itemsGroup = await initSavedItems(savedItems);
  } else {
    //itemsGroup.add(await spawnObjectRandomly('/models/alpaca.glb', 4, 'alpaca'))
    itemsGroup.add(await spawnObjectRandomly('/models/tree.glb', 4, 'item'))
    itemsGroup.add(await spawnObjectRandomly('/models/grass.glb', 30, 'decoration'))
    itemsGroup.add(await spawnObjectRandomly('/models/stones.glb', 4, 'decoration'))
  }
  scene.add(itemsGroup);
}

async function initSavedItems(savedItems) {
  const loadedItems = new THREE.Group()
  for (const item of savedItems) {
    const loadedItem = await createItem(item.path, item.position, item.rotation, item.scale);
    loadedItem.name = item.name;
    loadedItems.add(loadedItem);
  }
  return loadedItems;
}
