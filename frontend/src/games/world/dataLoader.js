import api from "../../services/api.js";
import { gUser } from "../core/globals.js";

export async function loadGameData() {
  try {
    const { data } = await api.get("users/me");
    const { farmData } = await api.get("users/me/farmData");
    data.alpacas = farmData.alpacas;
    data.items = farmData.items;
    data.coins = farmData.coins;
    data.upgrades = farmData.upgrades;
    gUser.value.coins = data.user.coins;
    gUser.value.upgrades = data.user.upgrades;
    return data.user;
  } catch (error) {
    console.error("Failed to load user stats:", error);
    return null;
  }
}
