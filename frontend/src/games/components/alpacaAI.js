import * as THREE from 'three';
import { checkWithinBounds, usePhysics } from '../core/usePhysics.js';
import { getRandomPos, getRandomTimer } from '../utils/randomValues.js';
import { gMinigame } from '../core/globals.js'

const dummy = new THREE.Object3D();

export function alpacaAI() {
  const { checkCollision } = usePhysics();

  const handleIdle = (alpaca, delta) => {
    const ai = alpaca.ai;
    const target = alpaca.target;

    ai.timer -= delta;
    if (ai.timer <= 0) {
      target.copy(getRandomPos());
      ai.state = 'moving';
      alpaca.spit()
    }
  };

  const handleMoving = (alpaca, delta) => {
    if (alpaca.isDead)
      return
    const ai = alpaca.ai;
    const model = alpaca.model;
    const target = alpaca.target;

    const distance = model.position.distanceTo(target);

    if (distance < 0.5) {
      ai.state = 'idle';
      ai.timer = getRandomTimer();
      alpaca.isAutoMoving = false
    } else {
      const direction = new THREE.Vector3().subVectors(target, model.position).normalize();

      dummy.position.copy(model.position);
      dummy.lookAt(target);

      const speed = alpaca.speed * delta;
      const nextX = model.position.x + (direction.x * speed);
      const nextZ = model.position.z + (direction.z * speed);
      const isWithinBounds = checkWithinBounds(nextX, nextZ);
      const isColliding = checkCollision(model, nextX, nextZ);
      const bounceDistance = 0.5;

      if (!isWithinBounds || isColliding) {
        const backwardVector = new THREE.Vector3(0, 0, -1);
        backwardVector.applyQuaternion(model.quaternion);
        if (isWithinBounds)
          model.position.addScaledVector(backwardVector, bounceDistance);
        ai.state = 'idle';
        ai.timer = 1;
        alpaca.isAutoMoving = false
      } else {
        model.position.x = nextX;
        model.position.z = nextZ;
        model.quaternion.slerp(dummy.quaternion, 5 * delta);
      }
    }
  };

  const updateAI = (alpaca, delta) => {
    if (gMinigame.value.mode > 1) // no AI update in multiplayer and alpacaRoad
      return
    switch (alpaca.ai.state) {
      case 'idle':
        handleIdle(alpaca, delta);
        break;
      case 'moving':
        handleMoving(alpaca, delta);
        break;
      default:
        console.warn(`Unknown AI state: ${alpaca.ai.state}`);
        alpaca.ai.state = 'idle';
        break;
    }
    alpaca.isMoving = (alpaca.ai.state === 'moving');
  };

  return { updateAI, handleMoving };
}