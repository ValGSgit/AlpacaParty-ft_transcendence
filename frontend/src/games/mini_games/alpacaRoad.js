import * as PRIMITIVES from '../assets/primitives.js';
import { CONST } from '../config/constants.js';
import { ROAD_MATERIALS } from '../config/materials.js';
import { createAlpaca } from '../core/createObjects.js';
import { gAlpacas, gCollidables, gItems, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { removeObject } from '../core/removeObjects.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomTimer } from '../utils/randomValues.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { changeFloorColor } from './utils.js';

let timer = 2
let timer_road = 0
let levelUpFactor
let alivePlayers
const roadSpeed = 0.5
const stripe = PRIMITIVES.Box(1, 0.1, 10, '#ffffff')
const pole = PRIMITIVES.Cylinder(0.5, 20, 64, [ROAD_MATERIALS.obstacle])

export async function initAlpacaRoad(playerCount, tempAlpacas) {
  gUser.value.gameMode = 3
  alivePlayers = playerCount
  setupEnvironment(gScene.value)
  const floor = gScene.value.floor
  floor.scale.x = 2
  floor.scale.z = 2
  levelUpFactor = 10
  changeFloorColor('#666666', '#222222')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  for (let i = 0; i < playerCount - 1; i++) {
    let alpaca
    if (tempAlpacas[i]) {
      alpaca = tempAlpacas[i]
      registerEntity(alpaca, 'alpaca')
    }
    else
      alpaca = await createAlpaca()
    if (i === 0) {
      alpaca.model.position.x -= 5
      gUser.value.name2p = alpaca.name
    }
    if (i === 1) {
      alpaca.model.position.x -= 10
      gUser.value.name3p = alpaca.name
    }
    if (i === 2) {
      alpaca.model.position.x += 5
      gUser.value.name4p = alpaca.name
    }
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
    const obstacle = pole.clone()
    obstacle.position.z = CONST.BASE_RADIUS * 2
    attachCollider(obstacle)
    obstacle.rotation.z = Math.PI / 2
    obstacle.position.x = -2.5
    obstacle.position.y = 0.5
    obstacle.pointGiven = false
    obstacle.speed = getRandomSpeed()
    gScene.value.add(obstacle)
    registerEntity(obstacle, 'item')
  }
}

export function updateObstacles() {
  let i = 0
  for (let i = 0; i < gAlpacas.length; ++i) {
    // sync UI hp and points
    if (i === 0) {
      gUser.value.hp = gAlpacas[0].hp; gUser.value.point = gAlpacas[0].point
    } else if (i === 1) {
      gUser.value.hp2p = gAlpacas[1].hp; gUser.value.point2p = gAlpacas[1].point
    } else if (i === 2) {
      gUser.value.hp3p = gAlpacas[2].hp; gUser.value.point3p = gAlpacas[2].point
    } else if (i === 3) {
      gUser.value.hp4p = gAlpacas[3].hp; gUser.value.point4p = gAlpacas[3].point
    }
    // check if someone got hit
    checkAlpaca(gAlpacas[i])
    if (gAlpacas[i].isBeingHit)
      spinAlpacaUp(gAlpacas[i])
    if (gAlpacas[i].isDead && !gAlpacas[i].isBeingHit && gUser.value.isPlaying) {
      if (gAlpacas[i].model.position.z > CONST.BASE_RADIUS * -1)
        gAlpacas[i].model.position.z -= roadSpeed
    }
  }
  while (gItems[i]) {
    let item = gItems[i]
    if (gUser.value.isPlaying)
      item.position.z -= item.speed
    if (item.position.z < 0) // get score
    {
      if (item.userData.isCollider === true && !item.pointGiven) // get points only with wood and only once
      {
        for (let i = 0; i < gAlpacas.length; ++i) {
          if (!gAlpacas[i].isDead && !gAlpacas[i].isBeingHit)
            gAlpacas[i].point++
          //gUser.value.point++
        }

        item.pointGiven = true
        if (levelUpFactor > 3 && gPlayer.value.point % 5 === 0) // timer will get smaller even 5 points time
          levelUpFactor -= 1
      }
      if (item.position.z < CONST.BASE_RADIUS * -1)
        removeObject(item)
    }
    i++
  }
}

function spinAlpacaUp(alpaca) {
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

function checkAlpaca(alpaca) {
  const { checkCollisionWith } = usePhysics()
  const isColliding = checkCollisionWith(alpaca.model, gCollidables);
  if (isColliding && !alpaca.isDead && !alpaca.isBeingHit) {
    alpaca.isBeingHit = true
    alpaca.hp--
    if (alpaca.hp === 0) {
      alpaca.isDead = 1
      alivePlayers--
      if (alivePlayers === 0)
        gUser.value.isPlaying = false
    }
  }
}

function spawnRoad(delta) {
  timer_road += delta
  if (timer_road > 1) {
    timer_road = 0
    let offset = -7.5
    for (let n = 0; n < 5; n++) {
      const line = stripe.clone()
      line.position.z = CONST.BASE_RADIUS * 2 - 5
      line.position.x -= offset
      line.speed = roadSpeed
      gScene.value.add(line)
      registerEntity(line, 'decoration')
      offset += 5
    }
  }
}

function getRandomSpeed() {
  let randomTime = getRandomTimer()
  randomTime = Math.floor(randomTime / 2)
  if (randomTime % 3 === 0)
    return 1 // fast
  else if (randomTime % 2 === 0)
    return 0.8 // middle
  return 0.6 //slow
}