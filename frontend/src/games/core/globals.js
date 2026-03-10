import { computed, ref, shallowRef } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = ref(null) // need ref for vue to refresh UI

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

export const gAlpacas = ref([]) // need to be ref to change speed in vue UI
export const gItems = shallowRef([])

export const gSelectable = computed(() => {
  const alpacaModels = gAlpacas.value.map(alpaca => alpaca.model)
  return [...alpacaModels, ...gItems.value]
})

// export const gCollidable
