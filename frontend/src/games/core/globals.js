import { shallowRef, ref } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = ref(null) // need ref for vue to refresh UI

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

export const gAlpacas = shallowRef([]) // changed from ref to avoid ghosts
export const gItems = shallowRef([])
// export const gSelectable 
// export const gColliders