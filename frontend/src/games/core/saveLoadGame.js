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

  const jsonStringItems = JSON.stringify(saveItems);
  const jsonStringAlpacas = JSON.stringify(saveAlpacas);

  try {
    await api.put('users/me', {
      items: jsonStringItems,
      alpacas: jsonStringAlpacas,
      coins: gUser.value.coins,
      upgrades: gUser.value.upgrades
    })
    console.log('✅ Farm stats synced to server')
  } catch (error) {
    console.error('Failed to sync farm stats:', error)
  }
}