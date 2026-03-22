import { gAlpacas, gCollectables, gCollidables, gEditables, gItems } from "./globals";

export function removeObject(entity) {
  const classInstance = entity;
  const model = entity.model ? entity.model : entity;

  removeFromRegistry(classInstance, gAlpacas);
  removeFromRegistry(classInstance, gItems);
  removeFromRegistry(classInstance, gCollectables);

  removeFromRegistry(model, gCollidables);
  removeFromRegistry(model, gEditables);

  if (model && model.parent) {
    console.log("removing entity");
    model.removeFromParent()
    removeMatsAndGeo(model);
  }
}

function removeFromRegistry(item, array) {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
}

function removeMatsAndGeo(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (child.material.isMaterial) {
        child.material.dispose();
      } else if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      }
    }
  });
}