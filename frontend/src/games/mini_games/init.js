import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { clearCoins } from '../components/coins.js';
import { CONST } from '../config/constants.js';
import { gAlpacas, gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { saveGame } from '../core/saveLoadGame.js';
import { useGameEngine } from '../core/useGameEngine.js';
import { initWorld } from '../world/initWorld.js';
import { initAlpacaRoad, initAlpacaRoadOnline } from './alpacaRoad.js';
import { initSpitRoyalAI, initSpitRoyalOnline } from './spitRoyal.js';

const miniGameContainer = ref(null)
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)
const tempAlpacas = []

export async function changeGame(mode, playerCount, matchId) {
  if (!gPlayer.value || !gUser.value) return;
  if (gMinigame.value.mode === 0)
    saveGame()
  gMinigame.value.isOnline = gMinigame.value.mode === 2 || gMinigame.value.mode === 4;
  if (playerCount === undefined)
    playerCount = 1
  gUI.lockCamera = false
  gUI.gameMenu = false
  gUI.lobbyMenu = false
  gUser.value.hp = CONST.HP
  gUser.value.point = 0
  resetAlpaca(gPlayer.value)
  gMinigame.value.isGameOver = false;
  gMinigame.value.players = [];
  tempAlpacas.length = 0
  for (let i = 1; i < gAlpacas.length; ++i) {
    if (gAlpacas[i] !== gPlayer.value) {
      tempAlpacas.push(gAlpacas[i])
      resetAlpaca(gAlpacas[i])
    }
  }
  clearScene(gScene.value)
  clearCoins()
  resetGArrays()

  switch (mode) {
    case 1:
      initSpitRoyalAI(playerCount, tempAlpacas);
      break;
    case 2:
      initSpitRoyalOnline(matchId);
      break;
    case 3:
      initAlpacaRoad(playerCount, tempAlpacas);
      break;
    case 4:
      initAlpacaRoadOnline(playerCount, tempAlpacas, matchId);
      break;
    default:
      await returnFarm();
  }
}

async function returnFarm() {
  const authStore = useAuthStore()
  gMinigame.value.isActive = false;
  gMinigame.value.mode = 0;
  gPlayer.value = null
  gUI.cameraMode = 0
  await initWorld(gScene.value, authStore.isAuthenticated)
  saveGame()
}

function resetAlpaca(alpaca) {
  alpaca.hp = CONST.HP
  alpaca.point = 0
  alpaca.isDead = 0
  alpaca.model.position.set(0, 0, 0)
  alpaca.model.rotation.y = 0
}