import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

export function cloneModel(model, color, name) {
  if (model === undefined)
    return

  if (color === undefined)
    color = 0x000000

  const clonedModel = SkeletonUtils.clone(model)

  clonedModel.rotation.set(0, 0, 0)
  clonedModel.quaternion.identity()
  clonedModel.name = name ?? "New " + model.name
  clonedModel.color = color

  clonedModel.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'Collider') {
        clonedModel.userData.collider = child
      } else if (child.name === 'Cylinder') {
        child.material = child.material.clone();
        child.material.color.set(color)
      }
    }
  })
  return clonedModel
}