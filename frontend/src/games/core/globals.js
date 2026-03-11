import { ref, shallowRef } from 'vue'

// export const gEngine = shallowRef(null)
// export const gScene = ref(null) // need ref for vue to refresh UI

// export const gPlayer = shallowRef(null)
// export const gUser = ref(null) // used to store user infos

// export const gAlpacas = { value: [] }         // Moving & Colliding
// export const gCollidable = { value: [] }
// export const gStaticColliders = { value: [] } // Colliding only (Trees, houses)
// export const gEditables = { value: [] }       // Clickable in Edit Mode (Alpacas, Trees, Flowers)
// export const gCoins = { value: [] }           // Distance-collection only




// --- VUE REACTIVE GLOBALS ---
// Use shallowRef for massive Three.js objects so Vue doesn't crash!
export const gEngine = shallowRef(null)
export const gScene = shallowRef(null)  // FIXED: Changed from ref to shallowRef!
export const gPlayer = shallowRef(null)

// Standard ref is perfect for pure data like user stats
export const gUser = ref(null)


// --- NON-REACTIVE GAME ENGINE BUCKETS ---
// The physics engine runs at 60fps. We don't want Vue trying to track these!
// Exporting them as plain arrays is the fastest possible way to store them.
export const gAlpacas = []
export const gCoins = []
export const gCollidable = []
export const gEditables = []
export const gItems = []