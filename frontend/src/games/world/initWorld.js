import api from '../../services/api.js'
import * as THREE from 'three'
import * as GRADIENT from "../utils/createGradient.js"
import * as PRIMITIVES from '../assets/primitives.js'
import { loadGLTF } from '../core/modelLoader.js'
import { CONST } from '../config/constants.js'
import { gPlayer, gAlpacas, gUser, gScene, gItems, gEngine } from '../core/globals.js'
import { usePhysics } from '../core/usePhysics.js'
import { useAuthStore } from '../../stores/auth.js'

const { isAuthenticated } = useAuthStore()

export async function initWorld(scene) {

  scene.background = GRADIENT.Linear('#4abdff', '#142191')
  let user = null
  if (isAuthenticated)
    user = await loadGame()
  else
    console.log("user not logged in, not loading")
  setupLighting(scene)
  createFloor(scene)

  if (!user || !user.alpacas || user.alpacas.length === 0) // newAlpaca or without login
  {
    const player = await loadPlayer(scene)
    gPlayer.value = player
    gAlpacas.value.push(player)
  }
  else // loadAlpaca
  {
    for (let i = 0; user.alpacas[i]; i++) {
      const player = await loadPlayer(scene, user.alpacas[i])
      gPlayer.value = player
      gAlpacas.value.push(player)
    }
  }
  if (!user || !user.items || user.items.length === 0)
    spawnTrees(scene)
  else
    spawnTrees(scene, user.items)
}

async function loadGame() {
  try {
    const { data } = await api.get('users/me')
    //console.log(data)
    //console.log(data.user.items)
    //console.log(data.user.alpacas)
    gUser.value.coins = data.user.coins
    gUser.value.upgrades = data.user.upgrades
    return data.user
  } catch (error) {
    console.error('Failed to load user stats:', error)
    return null
  }
}

function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  gScene.value.ambientLight = ambientLight
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
  gScene.value.sunLight = sunLight

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
  gScene.value.floor = floor
}

async function spawnTrees(scene, items) {
  const { model } = await loadGLTF('/models/tree.glb')
  const { checkCollisionWith } = usePhysics()
  const trees = new THREE.Group()
  let amount, x, y, z, scale

  if (items)
    amount = items.length
  else
    amount = Math.floor(CONST.FLOOR_RADIUS / 4)

  model.name = "tree" // change it later for other items
  for (let i = 0; i < amount; i++) {
    const treeClone = model.clone()
    treeClone.traverse((child) => {
      if (child.isMesh && child.name === 'Collider') {
        treeClone.userData.collider = child
      }
    })
    let isColliding = false
    do {
      if (items) // load items
      {
        model.name = items[i].name
        x = items[i].position[0]
        y = items[i].position[1]
        z = items[i].position[2]
        treeClone.rotation.y = items[i].rotation
        treeClone.scale.set(items[i].scale.x, items[i].scale.y, items[i].scale.z)
        treeClone.position.set(x, y, z)
      }
      else if (isColliding) // new or just spawn a tree if the loaded tree is colliding
      {
        x = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
        z = Math.floor((Math.random() - 0.5) * (CONST.FLOOR_RADIUS * 1.3))
        treeClone.rotation.y = Math.random() * Math.PI * 2
        scale = 1 + Math.random() * 0.6
        treeClone.position.set(x, 4.5 * scale, z)
        treeClone.scale.set(scale, scale, scale)
      }
      treeClone.updateMatrixWorld(true)
      isColliding = checkCollisionWith(treeClone, gAlpacas.value)
    } while (isColliding);

    trees.add(treeClone)
    gItems.value.push(treeClone)
  }
  gScene.value.add(trees)
}

async function loadPlayer(scene, alpaca) {
  const { model, mixer, animations } = await loadGLTF('/models/Llama.glb')
  if (model) {
    if (mixer && animations.length > 1)
      mixer.clipAction(animations[1]).play()
  }
  let speedOffset = 0
  let rotationOffset = 0
  model.name = "Alpaca"
  model.traverse((child) => {
    if (child.isMesh && child.name === 'Cylinder') {
      if (alpaca) // load alpaca color
      {
        child.material.color.set(alpaca.color)
        model.color = alpaca.color
      }
      else
        model.color = child.material.color.getHex(); // get default model color

    }
  })
  if (alpaca) // loading
  {
    model.name = alpaca.name
    model.color = alpaca.color
    model.position.x = alpaca.position[0]
    model.position.y = alpaca.position[1]
    model.position.z = alpaca.position[2]
    model.rotation.y = alpaca.rotation
    model.scale.set(alpaca.scale.x, alpaca.scale.y, alpaca.scale.z)
    speedOffset = alpaca.speedOffset
    rotationOffset = alpaca.rotationOffset
  }
  // flags init
  model.isMoving = false // this one is for doubleClick moving, not wasd
  model.isJumping = false
  model.isDead = 0 // 0 == normal, -1 == dying, 1 == dead
  model.isFalling = false
  model.currentAction = null
  model.target = null
  model.readyToMove = false
  scene.add(model)
  return { model, mixer, animations, speedOffset, rotationOffset }
}
