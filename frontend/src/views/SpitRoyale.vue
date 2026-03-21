<template>
  <section class="spit-royale" ref="root">
    <div id="lobby" class="lobby">
      <div class="emoji">🦙</div>
      <h1>Alpaca Spit Royale</h1>
      <p class="subtitle">Last alpaca standing wins</p>
      <input
        id="name-input"
        v-model="playerName"
        type="text"
        maxlength="16"
        placeholder="Your alpaca name..."
        @keydown.enter.prevent="start"
      >
      <button id="play-btn" @click="start">Spit and Play</button>
    </div>

    <div id="canvas-container"></div>

    <div id="hud">
      <div id="player-cards"></div>
      <div id="crosshair"></div>
      <div id="status-msg" class="hidden"></div>
      <div id="powerup-bar">
        <div id="pu-speed" class="powerup-icon" title="Speed">💨</div>
        <div id="pu-shield" class="powerup-icon" title="Shield">🛡️</div>
        <div id="pu-bigspit" class="powerup-icon" title="Big Spit">💧</div>
        <div id="pu-heal" class="powerup-icon" title="Heal">💚</div>
      </div>
      <div id="kill-feed"></div>
      <div id="controls-hint">
        WASD to move<br>
        Mouse to aim<br>
        Click or space to spit
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { SpitRoyaleClient } from '../spitroyale/SpitRoyaleClient.js'

const root = ref(null)
const playerName = ref('')
const authStore = useAuthStore()
let client = null

const start = () => {
  if (!client || !playerName.value.trim()) return
  localStorage.setItem('alpacaName', playerName.value.trim())
  client.connect(playerName.value.trim())
}

onMounted(() => {
  const saved = localStorage.getItem('alpacaName')
  playerName.value = saved || authStore.user?.username || ''
  client = new SpitRoyaleClient(root.value)
})

onUnmounted(() => {
  client?.destroy()
})
</script>

<style scoped>
.spit-royale { position: fixed; inset: 0; background: #0d0d0d; overflow: hidden; }
#canvas-container { position: fixed; inset: 0; }
#hud { position: fixed; inset: 0; pointer-events: none; display: none; z-index: 50; }

.lobby {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a0533 0%, #0d2137 50%, #0d330d 100%);
  z-index: 100;
}
.lobby h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 900;
  letter-spacing: -2px;
  background: linear-gradient(90deg, #f4a261, #e9c46a, #2a9d8f);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}
.subtitle { color: #aaa; font-size: 1.1rem; margin-bottom: 2.5rem; letter-spacing: 2px; text-transform: uppercase; }
.emoji { font-size: 5rem; margin-bottom: 1rem; animation: bounce 1.5s ease-in-out infinite; }

#name-input {
  width: 280px;
  padding: 0.75rem 1.25rem;
  border: 2px solid #f4a261;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  margin-bottom: 1rem;
}
#play-btn {
  padding: 0.85rem 3rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(90deg, #f4a261, #e76f51);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 24px rgba(244,162,97,0.4);
}
#play-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(244,162,97,0.5); }

#player-cards { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; }
.player-card { background: rgba(0,0,0,0.6); border: 2px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px 14px; min-width: 140px; backdrop-filter: blur(6px); }
.player-card.local-card { border-color: rgba(244,162,97,0.6); }
.player-name { font-size: 0.8rem; color: #ccc; margin-bottom: 4px; font-weight: 600; letter-spacing: 1px; }
.health-bar-bg { height: 10px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; }
.health-bar { height: 100%; border-radius: 999px; transition: width 0.15s; }

#crosshair { position: absolute; top: 50%; left: 50%; width: 24px; height: 24px; transform: translate(-50%, -50%); }
#crosshair::before, #crosshair::after { content: ''; position: absolute; background: rgba(255,255,255,0.7); border-radius: 999px; }
#crosshair::before { width: 2px; height: 100%; left: 50%; transform: translateX(-50%); }
#crosshair::after { height: 2px; width: 100%; top: 50%; transform: translateY(-50%); }

#status-msg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.75);
  color: #fff;
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 800;
  padding: 1rem 2.5rem;
  border-radius: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  text-align: center;
  letter-spacing: 1px;
  pointer-events: none;
}
.hidden { opacity: 0; }

#powerup-bar { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; align-items: center; }
.powerup-icon { width: 48px; height: 48px; background: rgba(0,0,0,0.6); border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; }
.powerup-icon.active { border-color: #f4a261; box-shadow: 0 0 12px rgba(244,162,97,0.6); }

#kill-feed { position: absolute; bottom: 80px; right: 16px; display: flex; flex-direction: column-reverse; gap: 6px; max-width: 260px; }
.kill-entry { background: rgba(0,0,0,0.6); border-radius: 8px; padding: 4px 10px; font-size: 0.78rem; color: #e9c46a; border-left: 3px solid #e76f51; }

#controls-hint { position: absolute; bottom: 24px; left: 16px; color: rgba(255,255,255,0.35); font-size: 0.75rem; line-height: 1.7; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
</style>
