import { ref } from 'vue'
import { saveGame } from '../core/saveLoadGame.js'
import { useGameEngine } from '../core/useGameEngine.js'
import { gScene, gPlayer, gAlpacas, gUI, gUser} from '../core/globals.js';
import { initWorld } from '../world/initWorld.js'
import { createAlpaca, createItem } from '../core/createObjects.js'
import { useAuthStore } from '../../stores/auth.js'
import { setupEnvironment } from '../world/sceneBuilder.js'
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';
import { CONST } from '../config/constants.js';
import { registerEntity } from '../core/registerEntity.js';
import * as GRADIENT from "../utils/createGradient.js"

const miniGameContainer = ref(null)

const { isAuthenticated } = useAuthStore()
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)

export async function changeGame() {
  if (!gPlayer.value || !gUser.value) return;

  gPlayer.value.hp = CONST.HP
  gUser.value.hp = CONST.HP
  gPlayer.value.point = 0
  gUser.value.point = 0
  clearScene(gScene.value)
  resetGArrays()
  if (gUser.value.gameMode === 0)
    initGame1()
  else {
  gUser.value.gameMode = 0
  gPlayer.value = null
  gUI.cameraMode = 0
  await initWorld(gScene.value, isAuthenticated)
  saveGame()
  }
}

async function initGame1(){

  gUser.value.gameMode = 1
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gUI.cameraMode = 1
  gScene.value.add(await spawnObjectRandomly('/models/alpaca.glb', 10, "alpaca"))
}

function changeFloorColor(top, bottom){
  const floorMat = gScene.value?.floor?.material?.[1];
  if (!floorMat) return;
  const newTexture = GRADIENT.Radial(top, bottom);
  if (floorMat.map) floorMat.map.dispose();
  floorMat.map = newTexture;
  floorMat.needsUpdate = true;
}