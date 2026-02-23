import { shallowRef, ref } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = ref(null) // need ref for vue to refresh UI

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

export const gFlags = ref(null)

export const gAlpacas = ref([])
export const gItems = ref([])
