<template>
  <div class="modal-overlay">
    <div v-if="gMinigame.mode === 2" class="shop-title">
      Spit Royale Lobby
      <button class="shop-btn" @click="handleCreateRoom(gMinigame.mode)" title="Create New Room">
        Create New Room
      </button>
      <button v-if="spitRooms.length > 0" class="shop-btn" @click="handleJoinRandom(gMinigame.mode)" title="Join Random Room">
        Join Random Room
      </button>
      <div v-for="room in spitRooms" :key="room.id">
        <button class="shop-btn" @click="handleJoinRoom(room.id)" title="Join Room">
          Join {{ room.name }} ({{ room.playerCount }}/10)
        </button>
      </div>
      <button class="close-btn" @click="closeLobbyMenu()" title="Close">✖️</button>
    </div>
    <div v-if="gMinigame.mode === 4">
      <div v-if="!gMinigame.currentRoomName" class="shop-title">
        Alpaca Road Lobby
        <button class="shop-btn" @click="handleCreateRoom(gMinigame.mode)" title="Create New Room">
          Create New Room
        </button>
        <div v-for="room in roadRooms" :key="room.id">
          <button class="shop-btn" @click="handleJoinRoom(room.id)">
            Join {{ room.name }} ({{ room.playerCount }}/4)
          </button>
        </div>
        <button class="close-btn" @click="closeLobbyMenu()" title="Close">✖️</button>
      </div>
      <div v-else class="shop-title"> 
        {{ gMinigame.currentRoomName }} ({{ gMinigame.players.length }}/4)
        <div v-for="player in gMinigame.players" :key="player.id" class="stat-row">
          {{ player.name }} - {{ player.isReady ? '✅ Ready' : '⏳ Waiting' }}
        </div>
        <button class="shop-btn" @click="toggleReady">
          {{ gMinigame.isReady ? 'Cancel Ready' : 'Ready Up' }}
        </button>
        <button class="close-btn" @click="leaveRoom" title="Leave">✖️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { gMinigame, gPlayer, gUser } from '../core/globals.js';
import { useUIManager } from '../core/useUIManager.js';
import { activeClient } from '../mini_games/GameClient.js';
import { changeGame } from '../mini_games/init.js';

const { closeLobbyMenu } = useUIManager()

const spitRooms = computed(() => {
  if (!gMinigame.value.publicRooms) return [];
  return gMinigame.value.publicRooms.filter(room => room.gameType === 2);
});

const roadRooms = computed(() => {
  if (!gMinigame.value.publicRooms) return [];
  return gMinigame.value.publicRooms.filter(room => room.gameType === 4);
});

onMounted(() => {
  activeClient.connect();
});

onUnmounted(() => {
  console.log("unmounted");
  if (!gMinigame.value.isActive && !gMinigame.value.isReady) {
    activeClient.disconnect();
    gMinigame.value.currentRoomName = null;
    gMinigame.value.isReady = false;
    changeGame();
  }
});

const handleCreateRoom = (gameType) => {
  const name = gUser.value.name || "Vue_Alpaca";
  const color = gPlayer.value?.color || "#ffffff";
  activeClient.createRoom(name, color, gameType);
};

const handleJoinRoom = (roomId) => {
  const name = gUser.value.name || "Vue_Alpaca";
  const color = gPlayer.value?.color || "#ffffff";
  activeClient.joinRoom(name, roomId, color);
};

const handleJoinRandom = (gameType) => {
  if (gameType !== 2) return;

  const rooms = spitRooms.value;
  if (rooms.length > 0) {
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    handleJoinRoom(randomRoom.id);
  }
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