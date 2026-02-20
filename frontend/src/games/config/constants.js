
export const CONST = {
  FLOOR_RADIUS: 25,
  PLAYER_FORWARD_SPEED: 0.2,
  PLAYER_ROTATION: 0.05,

  CALIBRATION: 25, // Change this for animation speed

  CAMERA_OFFSET: { x: 0, y: 3, z: 0 },
  CAMERA_LERP: 0.1,
  MIN_ZOOM: 10.0,
  MAX_ZOOM: 200.0,

  get MAX_MOVE_RADIUS() {
    return this.FLOOR_RADIUS - 2.0
  },

  get PLAYER_BACKWARD_SPEED() {
    return this.PLAYER_FORWARD_SPEED * 0.5
  }
}