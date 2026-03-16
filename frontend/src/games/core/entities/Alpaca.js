import * as THREE from 'three';
import { CONST } from '../../config/constants.js';

export class Alpaca {
  constructor(model, animations, options = {}) {
    this.model = model;
    this.animations = animations;
    this.name = options.name || "Alpaca";
    this.model.name = this.name;

    const pos = options.position || [0, 0, 0];
    const rotation = options.rotation || 0;
    const scale = options.scale || [1, 1, 1];

    this.model.position.set(...pos);
    this.model.rotation.set(0, rotation, 0);
    this.model.scale.set(...scale);
    this.model.updateMatrixWorld(true);

    if (options.color) {
      this.setColor(options.color);
    }

    this.mixer = new THREE.AnimationMixer(this.model);
    if (this.animations && this.animations.length > 1) {
      this.mixer.clipAction(this.animations[1]).play();
    }

    this.speedOffset = 0;
    this.rotationOffset = 0;
    this.isMoving = false;
    this.ai = {
      state: 'idle',
      target: new THREE.Vector3(),
      timer: Math.random() * 3
    };
  }

  setColor(color) {
    this.model.traverse((child) => {
      if (child.isMesh && child.name === 'Cylinder') {
        child.material = child.material.clone();
        child.material.color.set(color);
        this.color = color;
      }
    });
  }


  get speed() {
    return CONST.PLAYER_FORWARD_SPEED + this.speedOffset;
  }

  changeSpeed(amount) {
    if (amount >= CONST.PLAYER_FORWARD_SPEED) {
      amount = -CONST.PLAYER_FORWARD_SPEED + 0.1;
    }
    this.speedOffset += amount;
  }
}