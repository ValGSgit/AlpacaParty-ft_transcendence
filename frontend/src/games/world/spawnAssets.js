import * as THREE from 'three'
import { initFlags } from '../components/alpacaHandling.js'
import { CONST } from '../config/constants.js'
import { gAlpacas, gItems, gPlayer, gScene } from "../core/globals.js"
import { loadGLTF } from '../core/modelLoader.js'
import { usePhysics } from '../core/usePhysics.js'

export async function initializeAlpacas(scene, user) {
  const alpacasToLoad = (user?.alpacas?.length > 0) ? user.alpacas : [null];

  for (const savedData of alpacasToLoad) {
    const newAlpaca = await loadAlpaca(scene, savedData);

    // the first alpaca becomes the player
    if (!gPlayer.value) gPlayer.value = newAlpaca;
    gAlpacas.value.push(newAlpaca);
  }
}

function applyTreeColliderData(tree, baseTreeOBB) {
  tree.traverse((child) => {
    if (child.isMesh && child.name === 'Collider') {
      tree.userData.collider = child;
      if (baseTreeOBB) {
        child.userData.baseOBB = baseTreeOBB.clone();
      }
    }
  });
}

export async function spawnTrees(savedItems) {
  const { model } = await loadGLTF('/models/tree.glb');
  const treesGroup = new THREE.Group();

  model.traverse((child) => {
    if (child.isMesh && child.name === 'Collider') {
      model.userData.collider = child;
    }
  });

  const baseTreeCollider = model.userData.collider;
  const baseTreeOBB = baseTreeCollider?.userData?.baseOBB ? baseTreeCollider.userData.baseOBB.clone() : null;

  if (savedItems && savedItems.length > 0) {
    spawnSavedTrees(model, savedItems, treesGroup, baseTreeOBB);
  } else {
    const amount = Math.floor(CONST.FLOOR_RADIUS / 4);
    spawnRandomTrees(model, amount, treesGroup, baseTreeOBB);
  }
  gScene.value.add(treesGroup);
}

async function loadAlpaca(scene, savedData) {
  const { model, mixer, animations } = await loadGLTF('/models/alpaca.glb');

  if (mixer && animations.length > 1) {
    mixer.clipAction(animations[1]).play();
  }

  model.name = "Alpaca";
  let speedOffset = 0;
  let rotationOffset = 0;

  if (savedData) {
    applySaveData(model, savedData);
    speedOffset = savedData.speedOffset;
    rotationOffset = savedData.rotationOffset;
  }

  setupAlpacaMesh(model);
  initFlags(model);
  scene.add(model);

  return { model, mixer, animations, speedOffset, rotationOffset };
}

function applySaveData(model, data) {
  model.name = data.name;
  model.color = data.color;
  model.position.set(...data.position);
  model.rotation.y = data.rotation;
  model.scale.copy(data.scale);
}

function setupAlpacaMesh(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'Collider') {
        model.userData.collider = child;
      }
      else if (child.name === 'Cylinder') {
        if (!model.color) model.color = child.material.color.getHex();
        child.material.color.set(model.color);
      }
    }
  });
}

function spawnSavedTrees(baseModel, savedItems, parentGroup, baseTreeOBB) {
  for (const item of savedItems) {
    const tree = baseModel.clone();
    applyTreeColliderData(tree, baseTreeOBB);

    tree.name = item.name;
    tree.position.set(...item.position);
    tree.rotation.y = item.rotation;
    tree.scale.set(item.scale.x, item.scale.y, item.scale.z);

    parentGroup.add(tree);
    gItems.value.push(tree);
  }
}

function spawnRandomTrees(baseModel, amount, parentGroup, baseTreeOBB) {
  const { checkCollisionWith } = usePhysics();
  baseModel.name = "tree";

  const alpacaModels = gAlpacas.value.map(a => a.model);

  for (let i = 0; i < amount; i++) {
    const tree = baseModel.clone();
    applyTreeColliderData(tree, baseTreeOBB);

    let isColliding = true;
    let attempts = 0;

    while (isColliding && attempts < 50) {
      const angle = Math.random() * Math.PI * 2;
      const radius = CONST.MAX_MOVE_RADIUS * Math.sqrt(Math.random());
      const scale = 1 + Math.random() * 0.6;

      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.position.set(Math.cos(angle) * radius, 4.5 * scale, Math.sin(angle) * radius);
      tree.scale.set(scale, scale, scale);
      tree.updateMatrixWorld(true);

      isColliding = checkCollisionWith(tree, alpacaModels);
      attempts++;
    }

    parentGroup.add(tree);
    gItems.value.push(tree);
  }
}