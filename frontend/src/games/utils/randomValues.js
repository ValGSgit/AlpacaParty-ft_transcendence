import * as THREE from 'three';
import { CONST } from '../config/constants.js';

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
  const offset = 0.25;
  const lower = base - offset;
  const upper = base + offset;
  const scale = Math.random() * (upper - lower) + lower;
  return new THREE.Vector3(scale, scale, scale);
}

export function getRandomTimer() {
  return 2 + Math.random() * 5;
}
