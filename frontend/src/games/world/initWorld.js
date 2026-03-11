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
    const pos = savedData ? new THREE.Vector3(...savedData.position) : new THREE.Vector3(0, 0, 0);
    const color = savedData ? savedData.color : null;
    const name = savedData ? savedData.name : "Alpaca";

    const newAlpaca = await createAlpaca('/models/alpaca.glb', pos, color, name);

    if (savedData) {
      newAlpaca.model.rotation.y = savedData.rotation;
      newAlpaca.model.scale.copy(savedData.scale);
      newAlpaca.speedOffset = savedData.speedOffset;
      newAlpaca.rotationOffset = savedData.rotationOffset;
    }

    if (!gPlayer.value) gPlayer.value = newAlpaca;
    alpacaGroup.add(newAlpaca.model)
  }
  scene.add(alpacaGroup);
}

export async function initItems(scene, savedItems) {
  const itemsGroup = new THREE.Group();

  if (savedItems && savedItems.length > 0) {
    initSavedItems(savedItems, itemsGroup);
  } else {
    initRandomTrees(itemsGroup)
  }

  scene.add(itemsGroup);
}

async function initSavedItems(savedItems, itemsGroup) {

  for (const item of savedItems) {
    const pos = new THREE.Vector3(...item.position);

    const tree = await createItem('/models/tree.glb', pos, item.scale.x, item.rotation);
    tree.name = item.name;
    itemsGroup.add(tree);
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
    let scale = getRandomScale();
    let rot = getRandomRot();
    dummyTree.scale.set(scale, scale, scale);
    dummyTree.rotation.y = rot;

    while (isColliding && attempts < 50) {
      pos.copy(getRandomPos());
      dummyTree.position.copy(pos);
      dummyTree.updateMatrixWorld(true);
      isColliding = checkCollisionWith(dummyTree, gCollidable);
      attempts++;
    }
    const tree = await createItem('/models/tree.glb', pos, scale, rot);
    itemsGroup.add(tree);
  }
}