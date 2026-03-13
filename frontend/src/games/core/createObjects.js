import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { markRaw } from 'vue';
import { getModel } from './modelCache.js';
import { registerEntity } from './registerEntity.js';
import { attachCollider } from './useCollider.js';

export async function createAlpaca(
  name = "Alpaca",
  color = null,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1]
) {
  const path = '/models/alpaca.glb';
  const { model, animations } = await getModel(path);

  const clone = SkeletonUtils.clone(model);
  markRaw(clone);

  clone.position.set(...position);
  clone.rotation.set(0, rotation, 0);
  clone.scale.set(...scale);
  clone.name = name;

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

  const alpaca = {
    model: clone,
    mixer,
    animations,
    speedOffset: 0,
    rotationOffset: 0,
    ai: {
      state: 'idle',
      target: new THREE.Vector3(),
      timer: Math.random() * 5
    }
  };
  initFlags(alpaca.model);
  registerEntity(alpaca, 'alpaca');

  return alpaca;
}

export async function createItem(
  path,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1],
) {
  const { model } = await getModel(path);
  const clone = model.clone();
  markRaw(clone);

  clone.position.set(...position);
  clone.rotation.set(0, rotation, 0);
  clone.scale.set(...scale);
  clone.updateMatrixWorld(true);

  attachCollider(clone);
  registerEntity(clone, 'item');

  return clone;
}

export async function createDecoration(
  path,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1],
) {
  const { model } = await getModel(path);

  const clone = model.clone();
  markRaw(clone);

  clone.position.set(...position);
  clone.rotation.set(0, rotation, 0);
  clone.scale.set(...scale);
  clone.updateMatrixWorld(true);

  registerEntity(clone, 'decoration');
  return clone;
}

const initFlags = (model) => {
  model.isMoving = false // this one is for doubleClick moving, not wasd
  model.isJumping = false
  model.isDead = 0 // 0 == normal, -1 == dying, 1 == dead
  model.isFalling = false
  model.currentAction = null
  model.target = null
  model.readyToMove = true
}
