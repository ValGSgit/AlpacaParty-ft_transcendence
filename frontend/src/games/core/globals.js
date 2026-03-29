import { reactive, ref, shallowReactive, shallowRef } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = shallowRef(null)
export const gPlayer = shallowRef(null)
export const gUser = ref(null)

export const gUI = reactive({
  editMode: false,
  shopMenu: false,
  itemShop: false,
  alpacaShop: false,
  alpacaStats: false,
  isEditingName: false,
  lightMenu: false,
  gameMenu: false,
  cameraMode: 0,
  cameraPos: { x: 0, y: 0, z: 0 }
})

export const gEditState = shallowReactive({
  selected: null,
  ghost: null
});

export const gAlpacas = []
export const gCollectables = []
export const gCollidables = []
export const gEditables = []
export const gItems = []

