import { shallowRef, ref } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = shallowRef(null)

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

export const gAlpacas = ref([])
export const gItems = ref([])