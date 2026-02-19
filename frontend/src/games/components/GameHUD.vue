<template>
  <div class="game-hud">
    <div class="hud-top">
      <div class="farm-info">
        <span>{{ farmName }}</span>
      </div>
      <div class="hud-stats">
        <div class="stat">💰 {{ score }}</div>
      </div>
    </div>
    </div>
</template>

<script setup>
defineProps({
  score: Number,
  farmName: String,
  alpacas: Array
})
</script>

<style scoped>

/* Game HUD */
.game-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}

.game-hud > * {
  pointer-events: auto;
}

.hud-top {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;

  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
}

.farm-info {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.farm-name {
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.visiting-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-size: 0.8rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hud-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.stat-icon {
  font-size: 1.25rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.stat-value {
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hud-side {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hud-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.hud-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.hud-btn:active {
  transform: scale(0.95);
}

.return-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: rgba(255, 255, 255, 0.2);
}

.return-btn:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.menu-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-color: rgba(255, 255, 255, 0.2);
}

.menu-btn:hover {
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
}

</style>