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
import { createAlpaca } from '../core/createObjects.js';

let timer = 2
let timer_road = 0
let levelUpFactor
let alivePlayers
const roadSpeed = 0.5

export async function initAlpacaRoad(playerCount) {
  gUser.value.gameMode = 3
  alivePlayers = playerCount
  setupEnvironment(gScene.value)
  const floor = gScene.value.floor
  floor.scale.x = 2
  floor.scale.z = 2
  levelUpFactor = 10
  changeFloorColor('#454545', '#454545')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  for (let i = 1; i < playerCount; i++)
  {
    const alpaca = await createAlpaca()
    if (i === 1)
      alpaca.model.position.x -= 5
    if (i === 2)
      alpaca.model.position.x -= 10
    if (i === 3)
      alpaca.model.position.x += 5
    gScene.value.add(alpaca.model)
  }
  gUI.cameraMode = 1
}

export function spawnObstacles(delta) {

  spawnRoad(delta)
  timer -= delta;
  if (timer <= 0) {
    gUI.lockCamera = true
    timer = getRandomTimer() * levelUpFactor / 10;
    const texture = GRADIENT.Radial('#550000', '#550000')
    const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
    const matSide = new THREE.MeshStandardMaterial({ color: '#550000', roughness: 0.8 })
    const item = PRIMITIVES.Cylinder(0.5, 20, 64, [matSide, matTop, matSide])
    item.position.z = CONST.BASE_RADIUS * 2
    attachCollider(item)
    item.rotation.z = Math.PI / 2
    item.position.y = 0.5
    item.position.x = -2.5
    item.speed = getRandomSpeed()
    gScene.value.add(item)
    registerEntity(item, 'item')
  }
}

export function updateObstacles() {
  //const { checkCollisionWith } = usePhysics()
  let i = 0
  for (let i = 0; i < gAlpacas.length; ++i) {
    checkAlpaca(gAlpacas[i])
    if (gAlpacas[i].isBeingHit)
      spinAlpacaUp(gAlpacas[i])
    if (gAlpacas[i].isDead && !gAlpacas[i].isBeingHit && gUser.value.isPlaying)
    {
      if (gAlpacas[i].model.position.z > CONST.BASE_RADIUS * -1)
        gAlpacas[i].model.position.z -= roadSpeed
    }
  }
  while (gItems[i])
  {
    let item = gItems[i]
    if (gUser.value.isPlaying)
      item.position.z -= item.speed
    if (item.position.z < CONST.BASE_RADIUS * -1)//-5) // get score
    {
      if (!gPlayer.value.isDead && item.userData.isCollider === true) // get points only with collider
      {
        gUser.value.point++
        gPlayer.value.point++
        if (levelUpFactor > 3 && gPlayer.value.point % 5 === 0) // timer will get smaller even 5 points time
          levelUpFactor -= 1
      }
      removeObject(item)
    }
    i++
  }
}

function spinAlpacaUp(alpaca)
{
      alpaca.model.rotation.x += 0.1
      if (alpaca.model.rotation.x < Math.PI)
        alpaca.model.position.y += 0.5
      else
        alpaca.model.position.y -= 0.5
      if (alpaca.model.rotation.x > Math.PI * 2) //  360 degree
      {
        alpaca.model.rotation.x = 0
        alpaca.model.position.y = 0
        alpaca.isBeingHit = false
      }
}

function checkAlpaca(alpaca){
  const { checkCollisionWith } = usePhysics()
    const isColliding = checkCollisionWith(alpaca.model, gItems);
    if (isColliding && !alpaca.isDead && !alpaca.isBeingHit)
    {
      alpaca.isBeingHit = true
      alpaca.hp--
      //gUser.value.hp--
      if (alpaca.hp === 0)
      {
        alpaca.isDead = 1
        alivePlayers--
        if (alivePlayers === 0)
          gUser.value.isPlaying = false
      }
    }
}

function spawnRoad(delta){
  timer_road += delta
  if (timer_road > 1)
  {
    timer_road = 0
    let offset = -7.5
    for(let n = 0; n < 5; n++)
    {
      const line= PRIMITIVES.Box(1, 0.1, 10, '#ffffff')
      line.position.z = CONST.BASE_RADIUS * 2 - 5
      line.position.x -= offset
      line.speed = roadSpeed
      gScene.value.add(line)
      registerEntity(line, 'decoration')
      offset += 5
    }
  }
}

function getRandomSpeed(){
  let randomTime = getRandomTimer()
  randomTime = Math.floor(randomTime / 2)
  if(randomTime % 3 === 0)
    return 1 // fast
  else if(randomTime % 2 === 0)
    return 0.8 // middle
  return 0.6 //slow
}