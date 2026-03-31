// model: The loaded FBX or GLB scene/group
// shapeName: The exact name of the blendshape from Blender/Maya (e.g., "Chubby")
// weight: A number from 0.0 (off) to 1.0 (fully inflated)

export function setBlendshape(model, shapeName, weight) {
  model.traverse((child) => {

    // Check if this part of the model is a mesh AND has morph targets
    if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {

      // Look up the index of the blendshape by its string name
      const index = child.morphTargetDictionary[shapeName];

      // If we found the shape on this mesh, apply the weight!
      if (index !== undefined) {
        child.morphTargetInfluences[index] = weight;
      }
    }
  });
}