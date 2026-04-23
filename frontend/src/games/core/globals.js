import { reactive, ref, shallowReactive, shallowRef } from 'vue'
import { CONST } from '../config/constants'

export const gEngine = shallowRef(null)
export const gScene = shallowRef(null)
export const gPlayer = shallowRef(null)

export const gUser = ref({
  coins: 999,
  upgrades: 0,
  point: 0,
  hp: CONST.HP,
  name: "Alpaca 1",
})

export const gMinigame = ref({
  isActive: false,
  isGameOver: false,
  isReady: false,
  mode: 0,
  players: [],
  aliveCount: 0,
  lobby: []
})

export const gUI = reactive({
  editMode: false,
  shopMenu: false,
  itemShop: false,
  alpacaShop: false,
  alpacaStats: false,
  isEditingName: false,
  isLightCycling: true,
  lightMenu: false,
  gameMenu: false,
  isRoadGame: false,
  farmMenu: false,
  lobbyMenu: false,
  cameraMode: 0,
  cameraPos: { x: 0, y: 0, z: 0 },
  lockCamera: false,
  DoF: false
})

export const gEditState = shallowReactive({
  selected: null,
  ghost: null,
  cameraMode: 0,
});

export const gAlpacas = []
export const gCollectables = []
export const gCollidables = []
export const gEditables = []
export const gItems = []
export const gDecorations = []

