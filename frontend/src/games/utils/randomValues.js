import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { gScene } from '../core/globals.js';

export function getRandomPos() {
  const angle = Math.random() * Math.PI * 2;
  const radius = CONST.MAX_MOVE_RADIUS * Math.sqrt(Math.random());

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return new THREE.Vector3(x, 0, z)
}

export const spawnAtRandom = (model) => {
  const pos = getRandomPos();

  model.position.copy(pos);
  model.rotation.y = Math.random() * Math.PI * 2;

  const scale = 0.7 + Math.random() * 0.3;
  model.scale.multiplyScalar(scale);

  gScene.value.add(model);
}