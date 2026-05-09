import api from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.js'
import { gAlpacas, gDecorations, gItems, gMinigame, gPlayer, gUser } from './globals.js'


export async function saveGame() {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !authStore.user) {
    console.log("user not logged in, not saving")
    return
  }

  if (!gUser.value || !gPlayer.value) {
    return
  }

  if (gMinigame.value.mode) {
    saveMinigame();
    return
  }


  const saveAlpacas = gAlpacas.filter(a => !a.isAI).map(alpaca => {
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
      cost: alpaca.model.userData.cost,
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
        type: item.type,
        cost: item.model.userData.cost
      };
    });

    const decorations = gDecorations.map(item => {
      return {
        path: item.path,
        position: item.model.position.toArray(),
        rotation: item.model.rotation.y,
        scale: item.model.scale.toArray(),
        name: item.model.name,
        type: item.type,
        cost: item.model.userData.cost
      };
    });
    return [...items, ...decorations];
  };

  try {
    const itemsData = getItemsData();
    console.log("gUser:", gUser);
    const res = await api.put('/users/me/farmdata', {
      items: itemsData,
      alpacas: saveAlpacas,
      coins: gUser.value.coins,
      upgrades: gUser.value.upgrades,
      herdsize: gUser.value.herdsize
    })
    console.log(res);
    console.log('✅ Farm stats synced to server')
  } catch (error) {
    console.error('Failed to sync farm stats:', error)
  }
}

async function saveMinigame() {
  try {
    await api.put('/users/me/farmdata', {
      coins: gUser.value.coins,
    })
    console.log('✅ Farm stats synced to server after minigame')
  } catch (error) {
    console.error('Failed to sync farm stats:', error)
  }
}
