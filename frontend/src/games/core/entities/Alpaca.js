import * as THREE from 'three';
import { alpacaAI } from '../../components/alpacaAI.js';
import { alpacaHandling } from '../../components/alpacaHandling.js';
import { CONST } from '../../config/constants.js';
import { gAlpacas, gCollidables, gPlayer, gUI, gUser } from '../globals.js';
import { removeFromRegistry } from '../removeObjects.js';
import { handleAnimation } from '../useAnimation.js';
import { usePlayerControls } from '../usePlayerControls.js';

const { updateAI } = alpacaAI();
const { updatePlayer } = usePlayerControls();
const { makeSpit } = alpacaHandling()

export const alpaca = { name: 'Alpaca', path: '/models/alpaca.glb', type: 'alpaca' };

export class Alpaca {
  constructor(model, animations, options = {}) {
    this.model = model;
    this.animations = animations;
    this.name = options.name || "Alpaca";
    this.model.name = this.name;
    this.color = options.color || "#795740";

    const pos = options.position || [0, 0, 0];
    const rotation = options.rotation || 0;
    const scale = options.scale || [1, 1, 1];

    this.model.position.set(...pos);
    this.model.rotation.set(0, rotation, 0);
    this.model.rotation.reorder('YXZ'); // force calculate the left/right turn (Y) first
    this.model.scale.set(...scale);
    this.model.updateMatrixWorld(true);

    this.setColor(this.color);

    this.mixer = new THREE.AnimationMixer(this.model);
    if (this.animations && this.animations.length > 1) {
      this.mixer.clipAction(this.animations[1]).play();
    }

    this.speedOffset = 0;
    this.rotationOffset = 0;

    this.woolLevel = 1;
    this.aliveTime = 0;
    this.baseAge = 1;
    this.age = this.baseAge;

    this.isMoving = false;
    this.isAutoMoving = false;
    this.isBeingHit = false;
    this.target = new THREE.Vector3();
    this.point = 0;
    this.ai = {
      state: 'idle',
      timer: Math.random() * 3
    };
    this.isDead = 0 // 0 == normal, -1 == dying, 1 == dead
    this.hp = CONST.HP // hp of Alpaca
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

  get rotationSpeed() {
    return CONST.PLAYER_ROTATION + this.rotationOffset;
  }

  // CONST.PLAYER_FORWARD_SPEED = 0.2
  changeSpeed(amount) {
    if (this.speedOffset + amount < -0.1) {
      this.speedOffset = -0.1
    } else if (this.speedOffset + amount > 0.1) {
      this.speedOffset = 0.1
    } else {
      this.speedOffset += amount;
    }
  }

  update(delta) {
    const player = gPlayer.value;
    const isPlayer = (player && this.model.uuid === player.model.uuid);

    if (this.mixer) this.mixer.update(delta);

    this.checkAge(delta);

    if (gUI.editMode) {
      this.isMoving = false;
      this.animDir = 0;
    } else if (!isPlayer && gUser.value.gameMode !== 3) {
      updateAI(this, delta);
      this.animDir = this.isMoving ? 1 : 0;
    } else {
      updatePlayer(this, delta);
    }
    handleAnimation(this, this.animDir, this.speed);
  }

  checkAge(delta) {
    this.aliveTime += delta;
    const yearsPassed = Math.floor(this.aliveTime / CONST.SECONDS_PER_INGAME_YEAR);
    this.age = this.baseAge + yearsPassed;
  }

  spit() {
    makeSpit(this)
  }

  beingHit(alpaca) {
    if (this.isDead)
      return
    if (this.hp > 0 && gUser.value.gameMode) // only reduce hp in mini games
    {
      this.hp--
      if (this === gPlayer.value)
        gUser.value.hp--
    }

    if (this.hp === 0) {
      this.isDead = 1 // dead
      //remove itself from gCollidables
      removeFromRegistry(this.model, gCollidables)
      alpaca.point++ // credit for the spit owner
      if (alpaca === gPlayer.value)
        gUser.value.point++ // for display
      if (this === gPlayer.value)
        gUser.value.isPlaying = false // gameover
      if (gUser.value.isPlaying && gCollidables.length === 1)
        gUser.value.isPlaying = false // win, last standing alpaca
    }
    /*     else if (this.hp < 0)
        {
          this.hp = CONST.HP // resurrection
          this.isDead = 0
          //add itself again?
        } */
    else
      this.isDead = -1 // dying
  }
}

export function updateAlpacas(delta) {
  for (let i = 0; i < gAlpacas.length; i++) {
    const alpaca = gAlpacas[i]
    alpaca.update(delta);
  }
}