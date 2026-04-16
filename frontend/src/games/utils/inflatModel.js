import * as THREE from 'three';

export function inflateModel(modelGroup, inflateAmount) {
  // Loop through every part of the 3D model
  modelGroup.traverse((child) => {
    
    // We only want to modify actual 3D meshes
    if (child.isMesh) {
      const geometry = child.geometry;

      // 1. Grab the current positions and the normals (directions)
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;

      // Safety check: Make sure the model actually has normals!
      if (!normals) {
        console.warn("Cannot inflate: Model has no normals.");
        return;
      }

      // 2. Loop through every single vertex (x, y, z are stored in a flat array)
      for (let i = 0; i < positions.count; i++) {
        // Read the normal direction for this vertex
        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);

        // Read the current position
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);

        // 3. Math: Push the position outward along the normal by the inflateAmount
        positions.setXYZ(
          i,
          px + (nx * inflateAmount),
          py + (ny * inflateAmount),
          pz + (nz * inflateAmount)
        );
      }

      // 4. CRITICAL: Tell Three.js the geometry has changed so it updates the screen!
      positions.needsUpdate = true;
      
      // If you are using shadows, you also need to re-calculate the bounding spheres
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
    }
  });
}