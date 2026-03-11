import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { gCollidable } from './globals.js';
import { getModel } from './modelCache.js';
import { registerEntity } from './registerEntity.js';
import { attachCollider } from './useCollider.js';

export async function createAlpaca(path, position, color, name) {
  const { model, animations } = await getModel(path);

  const clone = SkeletonUtils.clone(model);
  clone.position.copy(position);
  clone.name = name ?? "NewAlpaca";

  if (color) {
    clone.traverse((child) => {
      //TODO: rename 3d Model
      if (child.isMesh && child.name === 'Cylinder') {
        child.material = child.material.clone();
        child.material.color.set(color);
        clone.color = color;
      }
    });
  }

  clone.updateMatrixWorld(true);
  attachCollider(clone);

  const mixer = new THREE.AnimationMixer(clone);
  if (animations && animations.length > 1) {
    mixer.clipAction(animations[1]).play();
  }

  const alpaca = { model: clone, mixer, animations, speedOffset: 0, rotationOffset: 0 };
  registerEntity(alpaca, 'alpaca');

  return alpaca;
}

export async function createItem(path, position, scale = 1, rotationY = 0) {
  const { model } = await getModel(path);

  const clone = model.clone();
  clone.position.copy(position);
  clone.scale.set(scale, scale, scale);
  clone.rotation.y = rotationY;
  clone.updateMatrixWorld(true);

  attachCollider(clone);

  registerEntity(clone, 'item');
  return clone;
}

export async function createDecoration(path, position, scale = 1, rotationY = 0) {
  const { model } = await getModel(path);

  const clone = model.clone();
  clone.position.copy(position);
  clone.scale.set(scale, scale, scale);
  clone.rotation.y = rotationY;

  registerEntity(clone, 'decoration');
  return clone;
}

export function removeObject(model) {
  const alpacaIndex = gAlpacas.findIndex(alpaca => alpaca.model === model);
  if (alpacaIndex > -1) gAlpacas.splice(alpacaIndex, 1);

  const itemIndex = gItems.indexOf(model);
  if (itemIndex > -1) gItems.splice(itemIndex, 1);

  const editIndex = gEditables.indexOf(model);
  if (editIndex > -1) gEditables.splice(editIndex, 1);

  const colliderIndex = gCollidable.indexOf(model);
  if (colliderIndex > -1) gCollidable.splice(colliderIndex, 1);

  const coinIndex = gCoins.indexOf(model)
  if (coinIndex > -1) gCoins.splice(coinIndex, 1);

  gScene.value.remove(model);
}
