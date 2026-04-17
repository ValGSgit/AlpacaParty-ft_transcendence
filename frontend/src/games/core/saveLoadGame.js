import api from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.js'
import { gAlpacas, gItems, gUser, gPlayer, gMinigame, gDecorations } from './globals.js'


export async function saveGame() {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !authStore.user) {
    console.log("user not logged in, not saving")
    return
  }

  if (gMinigame.value.mode)
    return

  if (!gUser.value || !gPlayer.value) {
    return
  }

  const saveAlpacas = gAlpacas.map(alpaca => {
    let selected = false
    if (gPlayer.value === alpaca)
      selected = true // save current selected alpaca
    return {
      name: alpaca.name,
      color: alpaca.color,
      position: alpaca.model.position.toArray(),
      rotation: alpaca.model.rotation.y,
      scale: alpaca.model.scale.toArray(),
      speedOffset: alpaca.speedOffset,
      rotationOffset: alpaca.rotationOffset,
      age: alpaca.age,
      aliveTime: alpaca.aliveTime,
      selected
    };
  });

const getItemsData = () => {
  const items = gItems.map(item => {
    return {
      path: item.path,
      position: item.model.position.toArray(),
      rotation: item.model.rotation.y,
      scale: item.model.scale.toArray(),
      name: item.model.name,
      type: item.type
    };
  });

  const decorations = gDecorations.map(item => {
    return {
      path: item.path,
      position: item.model.position.toArray(),
      rotation: item.model.rotation.y,
      scale: item.model.scale.toArray(),
      name: item.model.name,
      type: item.type
    };
  });
  return [...items, ...decorations];
};

  try {
    const itemsData = getItemsData();
    await api.put('/users/me/farmdata', {
      items: itemsData,
      alpacas: saveAlpacas,
      coins: gUser.value.coins,
      upgrades: gUser.value.upgrades
    })
    console.log('✅ Farm stats synced to server')
  } catch (error) {
    console.error('Failed to sync farm stats:', error)
  }
}
