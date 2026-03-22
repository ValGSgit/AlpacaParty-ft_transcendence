import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache = new Map();
const loader = new GLTFLoader();

export function getModel(path) {
  if (cache.has(path)) {
    return cache.get(path);
  }

  const loadPromise = new Promise((resolve, reject) => {
    loader.load(path, (gltf) => {
      resolve({
        model: gltf.scene,
        animations: gltf.animations
      });
    },
      undefined, // We can plug a LoadingManager in here later! To see a progress bar for example
      (error) => {
        console.error(`Failed to load model at ${path}`, error);
        cache.delete(path);
        reject(error);
      }
    );
  });

  cache.set(path, loadPromise);
  return loadPromise;
}

// TODO: check this out!
// Optional helper: Preload assets during a loading screen so gameplay is instantly smooth
export async function preloadModels(pathsArray) {
  await Promise.all(pathsArray.map(path => getModel(path)));
}