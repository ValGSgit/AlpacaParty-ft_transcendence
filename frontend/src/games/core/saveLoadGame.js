import api from '../../services/api.js'
import { gUser, gAlpacas, gItems } from './globals.js'


export async function saveGame() {
  const saveAlpacas = gAlpacas.value.map(alpaca => {
    return {
      position: alpaca.model.position.toArray(), // [x, y, z]
      rotation: alpaca.model.rotation.y,          // Just the Y axis
      speedOffset: alpaca.speedOffset,
      rotationOffset: alpaca.rotationOffset,
      name: alpaca.model.name,                    // e.g., "Alpaca_Brown"
      color: alpaca.model.color,
      scale: alpaca.model.scale
    };
  });

  const saveItems = gItems.value.map(item => {
    return {
      position: item.position.toArray(), // [x, y, z]
      rotation: item.rotation.y,          // Just the Y axis
      name: item.name,                    // e.g., "item_Brown"
      scale: item.scale
    };
  });

  const jsonStringItems = JSON.stringify(saveItems);
  const jsonStringAlpacas = JSON.stringify(saveAlpacas);
  //console.log(jsonStringItems)
  //console.log(jsonStringAlpacas)

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