import { shallowRef, ref, computed } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = ref(null) // need ref for vue to refresh UI

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

export const gAlpacas = ref([]) // need to be ref to change speed in vue UI
export const gItems = shallowRef([])

export const gSelectable = computed(() => {
  // Extract just the Three.js models from your custom alpaca objects
  const alpacaModels = gAlpacas.value.map(alpaca => alpaca.model)

  // Combine the extracted models with your items
  return [...alpacaModels, ...gItems.value]
})

// export const gSelectable 
// export const gColliders
