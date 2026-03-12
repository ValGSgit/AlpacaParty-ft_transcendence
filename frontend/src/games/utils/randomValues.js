import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { gScene } from '../core/globals.js';

export function getRandomPos() {
  const angle = getRandomRot();
  const radius = CONST.MAX_MOVE_RADIUS * Math.sqrt(Math.random());
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return new THREE.Vector3(x, 0, z)
}

export function getRandomVal() {
  const angle = getRandomRot();
  const radius = CONST.MAX_MOVE_RADIUS * Math.sqrt(Math.random());
  const random = Math.cos(angle) * radius;

  return random;
}

export function getRandomRot() {
  const angle = Math.random() * Math.PI * 2;
  return angle;
}

export function getRandomScale() {
  const base = 1.0;
  const offset = 0.2;
  const lower = base - offset;
  const upper = base + offset;
  const scale = Math.random() * (upper - lower) + lower;
  return scale;
}

export const spawnAtRandom = (model) => {
  const pos = getRandomPos();

  model.position.copy(pos);
  model.rotation.y = getRandomRot();

  const scale = getRandomPos();
  model.scale.multiplyScalar(scale);

  gScene.value.add(model);
}