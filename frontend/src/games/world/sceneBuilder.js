import * as THREE from 'three'
import * as PRIMITIVES from '../assets/primitives.js'
import { CONST } from '../config/constants.js'
import { gScene } from '../core/globals.js'
import * as GRADIENT from "../utils/createGradient.js"

export function setupEnvironment(scene) {
  scene.background = GRADIENT.Linear('#4abdff', '#142191')
  setupLighting(scene)
  createFloor(scene)
}

export function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.8)
  const sunLight = new THREE.DirectionalLight('#ffffff', 1.2)

  sunLight.position.set(10, 45, 3)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.bias = -0.001

  const d = 60
  sunLight.shadow.camera.left = -d
  sunLight.shadow.camera.right = d
  sunLight.shadow.camera.top = d
  sunLight.shadow.camera.bottom = -d

  scene.add(ambientLight)
  scene.add(sunLight)

  gScene.value.ambientLight = ambientLight
  gScene.value.sunLight = sunLight
}

function createFloor(scene) {
  const texture = GRADIENT.Radial('#7afc00', '#083f16')
  const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
  const matSide = new THREE.MeshStandardMaterial({ color: '#002208', roughness: 0.8 })

  const floor = PRIMITIVES.Cylinder(CONST.FLOOR_RADIUS, 1, 64, [matSide, matTop, matSide])
  floor.position.y = -floor.geometry.parameters.height / 2

  scene.add(floor)
  gScene.value.floor = floor
}