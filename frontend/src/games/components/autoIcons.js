import * as THREE from 'three';
import { getModel } from '../core/modelCache';
import { setupLighting } from '../world/sceneBuilder';
import { itemShop } from './itemShop';

const { shopItems } = itemShop();

export async function generateIcons() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(256, 256);
  const scene = new THREE.Scene();
  setupLighting(scene);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  for (const item of shopItems) {
    try {
      console.log(`Loading ${item.name}...`);
      const { model } = await getModel(item.path);

      // This figures out how big the model is and centers it perfectly
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Move the model so its exact center is at 0,0,0
      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      scene.add(model);

      // Move the camera back based on the size of the object so it always fits
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

      camera.position.set(cameraZ * 0.8, cameraZ * 0.6, cameraZ * 1.2);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');

      await fetch('http://localhost:3001/save-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, image: dataURL })
      });

      scene.remove(model);
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`Failed to generate icon for ${item.name}:`, error);
    }
  }
}
