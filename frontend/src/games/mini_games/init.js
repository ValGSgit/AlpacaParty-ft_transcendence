import { ref } from 'vue'
import * as GRADIENT from "../utils/createGradient.js"
import { saveGame } from '../core/saveLoadGame.js'
import { useGameEngine } from '../core/useGameEngine.js'
import { gScene, gPlayer, gAlpacas, gUI, gUser, gCollidables, gItems, gEngine} from '../core/globals.js';
import { initWorld } from '../world/initWorld.js'
import { useAuthStore } from '../../stores/auth.js'
import { setupEnvironment } from '../world/sceneBuilder.js'
import { CONST } from '../config/constants.js';
import { registerEntity } from '../core/registerEntity.js';
import { clearCoins } from '../components/coins.js'
import { initSpitRoyalAI, initSpitRoyalOnline, cleanupClient } from './spitRoyale.js';
import { initAlpacaRoad } from './alpacaRoad.js';
import { changeFloorColor } from './utils.js';

const miniGameContainer = ref(null)
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)
const tempAlpacas = []

export async function changeGame(mode, playerCount) {
  if (!gPlayer.value || !gUser.value) return;
  if (gUser.value.gameMode === 0)
    saveGame()
  // clean up all clients
  cleanupClient()
  // Reset state
  if (playerCount === undefined)
    playerCount = 1
  gUI.lockCamera = false
  gUI.gameMenu = false
  gPlayer.value.hp = CONST.HP
  gUser.value.hp = CONST.HP
  gUser.value.isPlaying = true
  gPlayer.value.point = 0
  gUser.value.point = 0
  gUser.value.name = gPlayer.value.name
  gPlayer.value.model.position.set(0, 0, 0)
  gPlayer.value.model.rotation.y = 0
  gUser.value.point2p = -1
  gUser.value.point3p = -1
  gUser.value.point4p = -1
  gUser.value.hp2p = -1
  gUser.value.hp3p = -1
  gUser.value.hp4p = -1
  tempAlpacas.length = 0
  if (playerCount)
  {
    for (let i = 0; i < gAlpacas.length && playerCount; ++i) {
      if (gAlpacas[i] !== gPlayer.value)
      {
        tempAlpacas.push(gAlpacas[i])
        gAlpacas[i].model.position.set(0, 0, 0)
        gAlpacas[i].model.rotation.y = 0
      }
    }
  }
  clearScene(gScene.value)
  clearCoins()
  resetGArrays()
  if (mode === 1)
    initSpitRoyalAI(playerCount, tempAlpacas)
  else if (mode === 2)
    initSpitRoyalOnline()
  else if (mode === 3)
    await initAlpacaRoad(playerCount, tempAlpacas)
  else 
    await returnFarm()
}

async function returnFarm(){
  const { isAuthenticated } = useAuthStore()
  gUser.value.isPlaying = false
  gUser.value.gameMode = 0
  gPlayer.value = null
  gUI.cameraMode = 0
  await initWorld(gScene.value, isAuthenticated)
  saveGame()
}