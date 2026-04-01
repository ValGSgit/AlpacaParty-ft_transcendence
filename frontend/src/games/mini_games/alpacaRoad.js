import { gScene, gPlayer, gAlpacas, gUI, gUser, gCollidables, gItems, gEngine} from '../core/globals.js';
import { changeFloorColor } from './utils.js';
import { setupEnvironment } from '../world/sceneBuilder.js'
import { registerEntity } from '../core/registerEntity.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js'
import * as THREE from 'three';
import * as PRIMITIVES from '../assets/primitives.js'
import * as GRADIENT from "../utils/createGradient.js"
import { removeObject } from '../core/removeObjects.js'
import { CONST } from '../config/constants.js';

let timer = 1
let isBeingHit = false

export function initAlpacaRoad() {
  gUser.value.gameMode = 3
  setupEnvironment(gScene.value)
  changeFloorColor('#454545', '#454545')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
}

export function spawnObstacles(delta) {

  timer -= delta;
  if (timer <= 0) {
    timer = getRandomTimer();
    console.log("Spawn item!");
    const texture = GRADIENT.Radial('#550000', '#550000')
    const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
    const matSide = new THREE.MeshStandardMaterial({ color: '#550000', roughness: 0.8 })
    const item = PRIMITIVES.Cylinder(0.5, 10, 64, [matSide, matTop, matSide])
    item.position.z = CONST.BASE_RADIUS
    attachCollider(item)
    item.rotation.z = Math.PI / 2
    item.position.y = 0.5
    gScene.value.add(item)
    registerEntity(item, 'item')
  }
}

export function updateObstacles() {
  const { checkCollisionWith } = usePhysics()
  let i = 0
  if (isBeingHit)
    spinAlpacaUp()
  while (gItems[i])
  {
    let item = gItems[i]
    item.position.z -= 0.5
    const isColliding = checkCollisionWith(gPlayer.value.model, gCollidables);
    if (isColliding && !gPlayer.value.isDead)
    {
      isBeingHit = true
      gPlayer.value.hp--
      gUser.value.hp--
      removeObject(item)
      if (gPlayer.value.hp === 0)
      {
        gPlayer.value.isDead = 1
        gUser.value.isPlaying = false
      }
      break
    }
    if (item.position.z < -5) // get score
    {
      removeObject(item)
      if (!gPlayer.value.isDead)
      {
        gUser.value.point++
        gPlayer.value.point++
      }
    }
    i++
  }
}

function spinAlpacaUp()
{
      gPlayer.value.model.rotation.x += 0.1
      if (gPlayer.value.model.rotation.x < Math.PI)
        gPlayer.value.model.position.y += 0.5
      else
        gPlayer.value.model.position.y -= 0.5
      if (gPlayer.value.model.rotation.x > Math.PI * 2) //  360 degree
      {
        gPlayer.value.model.rotation.x = 0
        gPlayer.value.model.position.y = 0
        isBeingHit = false
      }
}