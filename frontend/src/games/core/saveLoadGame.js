import api from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.js'
import { gAlpacas, gItems, gUser } from './globals.js'

const { isAuthenticated } = useAuthStore()

export async function saveGame() {
  if (!isAuthenticated) {
    console.log("user not logged in, not saving")
    return
  }

  const saveAlpacas = gAlpacas.map(alpaca => {
    return {
      name: alpaca.model.name,
      color: alpaca.model.color,
      position: alpaca.model.position.toArray(),
      rotation: alpaca.model.rotation.y,
      scale: alpaca.model.scale.toArray(),
      speedOffset: alpaca.speedOffset,
      rotationOffset: alpaca.rotationOffset,
    };
  });

  const saveItems = gItems.map(item => {
    return {
      position: item.model.position.toArray(),
      rotation: item.model.rotation.y,
      scale: item.model.scale.toArray(),
      name: item.model.name
    };
  });

  // Build the farmData object to match backend expectations
  const farmData = {
    alpacas: saveAlpacas,
    items: saveItems,
    resources: {
      gold: gUser.value.coins,
      // Add other resources as needed (e.g., food)
    },
    upgrades: gUser.value.upgrades,
    // Add other farm state fields as needed
  };

  try {
    await api.put('/game/farm', { farmData });
    console.log('✅ Farm stats synced to server');
  } catch (error) {
    console.error('Failed to sync farm stats:', error);
  }
}