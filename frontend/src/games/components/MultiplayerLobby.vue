<template>
  <div class="modal-overlay">
    <div v-if="!gMinigame.currentRoomName" class="shop-title">
      Alpaca Road Lobby
      <button class="shop-btn" @click="handleCreateRoom" title="Create New Room">
        Create New Room
      </button>
      <div v-for="room in gMinigame.publicRooms" :key="room.id">
        <button class="shop-btn" @click="handleJoinRoom(room.id)">
          Join {{ room.name }} ({{ room.playerCount }}/4)
        </button>
      </div>
      <button class="close-btn" @click="closeLobbyMenu()" title="Close"><AppIcon name="close" :size="16" /></button>
    </div>
    <div v-else class="shop-title"> {{ gMinigame.currentRoomName }} {{ gMinigame.players.length }}/4
      <div v-for="player in gMinigame.players" :key="player.id" class="stat-row">
        {{ player.name }} - {{ player.isReady ? '✅ Ready' : '⏳ Waiting' }}
      </div>
      <button class="shop-btn" @click="toggleReady">
        {{ gMinigame.isReady ? 'Cancel Ready' : 'Ready Up' }}
      </button>
      <button class="close-btn" @click="leaveRoom" title="Leave"><AppIcon name="close" :size="16" /></button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import AppIcon from '../../components/AppIcon.vue';
import { gMinigame, gPlayer, gUser } from '../core/globals.js';
import { useUIManager } from '../core/useUIManager.js';
import { activeClient } from '../mini_games/GameClient.js';
import { changeGame } from '../mini_games/init.js';

const { closeLobbyMenu } = useUIManager()

onMounted(() => {
  activeClient.connect();
});

onUnmounted(() => {
  if (!gMinigame.value.isActive && !gMinigame.value.isReady) {
    activeClient.disconnect();
    gMinigame.value.currentRoomName = null;
    gMinigame.value.isReady = false;
    changeGame();
  }
});

const handleCreateRoom = () => {
  const name = gUser.value.name || "Vue_Alpaca";
  const color = gPlayer.value?.color || "#ffffff";
  activeClient.createRoom(name, color);
};

const handleJoinRoom = (roomId) => {
  const name = gUser.value.name || "Vue_Alpaca";
  const color = gPlayer.value?.color || "#ffffff";
  activeClient.joinRoom(name, roomId, color);
};

const toggleReady = () => {
  gMinigame.value.isReady = !gMinigame.value.isReady;
  activeClient.sendReady(gMinigame.value.isReady);
};

const leaveRoom = () => {
  activeClient.disconnect(); 
  gMinigame.value.currentRoomName = null;
  gMinigame.value.isReady = false;
  setTimeout(() => {
    activeClient.connect();
  }, 25);
};

</script>

<!---------------------- STYLE ------------------------->
<style src="../game.css" scoped></style>