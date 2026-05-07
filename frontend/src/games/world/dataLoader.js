import api from '../../services/api.js';
import { gUser } from '../core/globals.js';

export async function loadGameData() {
  try {
    const res = await api.get('/users/me/farmdata')
    const farmData = res.data.farmData;
    gUser.value.coins = farmData.coins;
    gUser.value.upgrades = farmData.upgrades;
    gUser.value.herdsize = farmData.herdsize;

    console.log("FarmData:", farmData);
    return farmData
  } catch (error) {
    console.error('Failed to load user stats:', error)
    return null
  }
}