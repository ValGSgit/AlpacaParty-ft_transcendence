import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { clearCoins } from '../components/coins.js';
import { CONST } from '../config/constants.js';
import { gAlpacas, gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { saveGame } from '../core/saveLoadGame.js';
import { useGameEngine } from '../core/useGameEngine.js';
import { initWorld } from '../world/initWorld.js';
import { initAlpacaRoad } from './alpacaRoad.js';
import { cleanupClient, initSpitRoyalAI, initSpitRoyalOnline } from './spitRoyale.js';

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

  gMinigame.value.players = [];
  tempAlpacas.length = 0
  for (let i = 0; i < gAlpacas.length && i < playerCount - 1; ++i) {
    if (gAlpacas[i] !== gPlayer.value) {
      tempAlpacas.push(gAlpacas[i])
      gAlpacas[i].model.position.set(0, 0, 0)
      gAlpacas[i].model.rotation.y = 0
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

async function returnFarm() {
  const { isAuthenticated } = useAuthStore()
  gMinigame.value.isActive = false;
  gMinigame.value.mode = 0;
  gPlayer.value = null
  gUI.cameraMode = 0
  await initWorld(gScene.value, isAuthenticated)
  saveGame()
}