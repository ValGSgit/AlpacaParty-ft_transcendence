import { reactive, ref, shallowReactive, shallowRef } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = shallowRef(null)
export const gPlayer = shallowRef(null)
export const gUser = ref(null)

export const gUI = reactive({
  pause: false,
  editMode: false,
  shopMenu: false,
  itemShop: false,
  alpacaShop: false,
  newAlpaca: false,
  lightMenu: false,
  cameraMode: 0
})

// we could make this global if we want to add UI elements when we select Items
// Use shallowReactive so the UI knows WHEN an item is selected, 
// but it doesn't crash trying to read the 3D data!
export const gEditState = shallowReactive({
  selected: null,
  ghost: null
});

// --- NON-REACTIVE GAME ENGINE BUCKETS ---
export const gAlpacas = []
export const gCoins = []
export const gCollidable = []
export const gEditables = []
export const gItems = []

