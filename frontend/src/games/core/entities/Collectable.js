import * as THREE from 'three';
import { gPlayer, gUser } from '../globals';
import { removeObject } from '../removeObjects';

export class Collectable {
  constructor(model, animations, options = {}) {
    this.model = model;
    this.animations = animations;

    const pos = options.position || [0, 0, 0];
    const rotation = options.rotation || 0;
    const scale = options.scale || [0, 0, 0];

    this.model.position.set(...pos);
    this.model.rotation.set(0, rotation, 0);
    this.model.scale.set(0, 0, 0);
    //this.model.scale.set(...scale);
    this.model.updateMatrixWorld(true);
    this.targetScale = new THREE.Vector3(1, 1, 1);
    this.new = true;

    if (this.animations && this.animations.length > 1) {
      this.mixer = new THREE.AnimationMixer(this.model);
      const action = this.mixer.clipAction(this.animations[0]);
      action.play();
    }
  }

  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.new) {
      this.scaleUp(delta)
    }

    const distance = this.model.position.distanceTo(gPlayer.value.model.position);
    if (distance < 2.5) {
      console.log("collect coin!");
      gUser.value.coins += 1;
      this.destroy();
    }
  }

  scaleUp(delta) {
    if (this.model.scale.distanceTo(this.targetScale) < 0.01) {
      this.model.scale.copy(this.targetScale);
      this.new = false;
    } else {
      this.model.scale.lerp(this.targetScale, delta * 2.5);
    }
  }

  destroy() {
    if (this.model) {
      removeObject(this);
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
}