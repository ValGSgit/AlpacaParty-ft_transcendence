import * as THREE from 'three'
import * as GRADIENT from "../utils/createGradient.js"
import * as PRIMITIVES from '../assets/primitives.js'
import { loadGLTF } from '../core/modelLoader.js'
import { CONST } from '../config/constants.js'
import { gPlayer, gAlpacas } from '../core/globals.js'

export async function initWorld(scene) {

  scene.background = GRADIENT.Linear('#4abdff', '#142191')
  setupLighting(scene)
  createFloor(scene)
  spawnTrees(scene)
  const player = await loadPlayer(scene)
  gPlayer.value = player
  gAlpacas.value.push(player)
}

function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const sunLight = new THREE.DirectionalLight('#ffffff', 1.2)
  sunLight.position.set(10, 45, 3)
  sunLight.castShadow = true
  sunLight.shadow.bias = -0.001

  const d = 60
  sunLight.shadow.camera.left = -d
  sunLight.shadow.camera.right = d
  sunLight.shadow.camera.top = d
  sunLight.shadow.camera.bottom = -d
  scene.add(sunLight)

  // Helper to see LightBox
  // const helper = new THREE.CameraHelper(sunLight.shadow.camera)
  // scene.add(helper)
}

function createFloor(scene) {
  const texture = GRADIENT.Radial('#7afc00', '#083f16')
  const matTop = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8
  })

  const matSide = new THREE.MeshStandardMaterial({
    color: '#002208',
    roughness: 0.8
  })

  const floor = PRIMITIVES.Cylinder(
    CONST.FLOOR_RADIUS, // Radius
    1,  // Height
    64, // Segments
    [matSide, matTop, matSide]
  )
  floor.position.y = - floor.geometry.parameters.height / 2
  scene.add(floor)
}

async function spawnTrees(scene) {
  const { model } = await loadGLTF('/models/tree.glb')
  const amount = Math.floor(CONST.FLOOR_RADIUS / 3)
  const trees = new THREE.Group()
  for (let i = 0; i < amount; i++) {
    const x = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    const z = (Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3)
    const treeClone = model.clone()
    treeClone.rotation.y = Math.random() * Math.PI * 2
    const scale = 1 + Math.random() * 0.6
    treeClone.position.set(x, 4.5 * scale, z) // FIX 3D Model for offset
    treeClone.scale.multiplyScalar(scale)
    trees.add(treeClone)
  }
  scene.add(trees)
}

async function loadPlayer(scene) {
  const { model, mixer, animations } = await loadGLTF('/models/Llama.glb')
  if (model) {
    model.scale.multiplyScalar(1)
    if (mixer && animations.length > 1)
      mixer.clipAction(animations[1]).play()
    scene.add(model)
  }
  return { model, mixer, animations }
}