import * as THREE from 'three'
import { createAlpaca, createItem } from '../core/createObjects.js'
import { gCollidable, gPlayer } from '../core/globals.js'
import { getModel } from '../core/modelCache.js'
import { attachCollider } from '../core/useCollider.js'
import { usePhysics } from '../core/usePhysics.js'
import { getRandomPos, getRandomRot, getRandomScale } from '../utils/randomValues.js'
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
        '/models/alpaca.glb',
        savedData.position,
        savedData.rotation,
        savedData.scale,
        savedData.color,
        savedData.name
      );
      newAlpaca.speedOffset = savedData.speedOffset;
      newAlpaca.rotationOffset = savedData.rotationOffset;
    } else {
      newAlpaca = await createAlpaca('/models/alpaca.glb');
    }
    if (!gPlayer.value) gPlayer.value = newAlpaca;
    alpacaGroup.add(newAlpaca.model)
  }
  scene.add(alpacaGroup);
}

export async function initItems(scene, savedItems) {
  const itemsGroup = new THREE.Group();

  if (savedItems && savedItems.length > 0) {
    await initSavedItems(savedItems, itemsGroup);
  } else {
    initRandomTrees(itemsGroup)
  }

  scene.add(itemsGroup);
}

async function initSavedItems(savedItems, itemsGroup) {

  for (const item of savedItems) {
    const loadedItem = await createItem('/models/tree.glb', item.position, item.rotation, item.scale);
    loadedItem.name = item.name;
    itemsGroup.add(loadedItem);
  }
}

async function initRandomTrees(itemsGroup) {
  const { checkCollisionWith } = usePhysics();
  const { model } = await getModel('/models/tree.glb');
  const dummyTree = model.clone();
  attachCollider(dummyTree);

  const amount = 5;
  for (let i = 0; i < amount; i++) {
    let isColliding = true;
    let attempts = 0;
    let pos = new THREE.Vector3();
    let scaleVal = getRandomScale();
    let scale = [scaleVal, scaleVal, scaleVal];
    let rot = getRandomRot();
    dummyTree.scale.set(scale, scale, scale);
    dummyTree.rotation.y = rot;

    while (isColliding && attempts < 50) {
      pos.copy(getRandomPos());
      dummyTree.position.set(...pos);
      dummyTree.updateMatrixWorld(true);
      isColliding = checkCollisionWith(dummyTree, gCollidable);
      attempts++;
    }
    const tree = await createItem('/models/tree.glb', pos, rot, scale);
    itemsGroup.add(tree);
  }
}