
import { gAlpacas, gUser } from '../core/globals.js'

export const CONST = {
  BASE_RADIUS: 25,
  PLAYER_FORWARD_SPEED: 0.2,
  PLAYER_ROTATION: 0.05,

  JUMPING_SPEED: 0.1,
  JUMPING_MAX_HEIGHT: 2,

  CALIBRATION: 25, // Change this for animation speed

  CAMERA_OFFSET: { x: 0, y: 3, z: 0 },
  CAMERA_LERP: 0.025,
  MIN_ZOOM: 10.0,
  MAX_ZOOM: 200.0,

  DEBUG: 0,
  COLLIDER_SIZE: 0.8,

  MAX_UPGRADES: 5,

  HP: 1, // TODO: change back to 3
  SECONDS_PER_INGAME_YEAR: 300,
  SECONDS_PER_DAYPHASE: 60,

  get ALPACA_COST() {
    return gAlpacas.length
  },

  get FLOOR_RADIUS() {
    return this.BASE_RADIUS + (gUser.value.upgrades * 5.0) //change upgrade size
  },

  get MAX_MOVE_RADIUS() {
    return this.FLOOR_RADIUS - 2
  },

  get MAX_COINS() {
    return 3 + gUser.value.upgrades;
  },

  get PLAYER_BACKWARD_SPEED() {
    return this.PLAYER_FORWARD_SPEED * 0.5
  }
}