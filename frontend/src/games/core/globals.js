import { ref, shallowRef } from 'vue'

export const gEngine = shallowRef(null)
export const gScene = ref(null) // need ref for vue to refresh UI

export const gPlayer = shallowRef(null)
export const gUser = ref(null) // used to store user infos

//export const gAlpacas = ref([]) // need to be ref to change speed in vue UI
// export const gItems = shallowRef([])
// export const gSelectable = computed(() => {
//   const alpacaModels = gAlpacas.value.map(alpaca => alpaca.model)
//   return [...alpacaModels, ...gItems.value]
// })

export const gAlpacas = { value: [] }         // Moving & Colliding
export const gStaticColliders = { value: [] } // Colliding only (Trees, houses)
export const gEditables = { value: [] }       // Clickable in Edit Mode (Alpacas, Trees, Flowers)
export const gCoins = { value: [] }           // Distance-collection only

// export const gCollidable


// import { gAlpacas, gCoins, gEditables, gStaticColliders } from '../core/globals.js'

// export function registerEntity(entity, type) {
//   // 1. Handle the Wrapper vs. Mesh difference
//   // Alpacas pass a wrapper object, trees/coins pass a raw 3D mesh. 
//   // We need to make sure we attach tags to the actual 3D model!
//   const model = entity.model ? entity.model : entity;

//   // 2. Attach universally helpful tags to the userData object
//   model.userData.entityType = type;

//   // 3. Sort the entity into the correct logic buckets
//   switch (type) {
//     case 'alpaca':
//       model.userData.isEditable = true;
//       gAlpacas.value.push(entity);     // Push the full wrapper for the animation loop
//       gEditables.value.push(model);    // Edit mode only needs the 3D model
//       break;

//     case 'static_collider':
//       model.userData.isEditable = true;
//       model.userData.isCollider = true;
//       gStaticColliders.value.push(model);
//       gEditables.value.push(model);
//       break;

//     case 'decoration':
//       model.userData.isEditable = true;
//       model.userData.isCollider = false;
//       gEditables.value.push(model);    // No physics array! The player walks right through it.
//       break;

//     case 'coin':
//       model.userData.isEditable = false;
//       model.userData.isCollider = false;
//       gCoins.value.push(model);        // Completely isolated from physics and edit mode
//       break;

//     default:
//       console.warn(`Registry Warning: Unknown entity type '${type}'`);
//   }
// }