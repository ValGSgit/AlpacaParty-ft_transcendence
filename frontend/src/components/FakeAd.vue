<template>
  <div v-if="visible" class="fake-ad-overlay" @click.self="closeAd">
    <div class="fake-ad-container">
      <!-- Ad Header -->
      <div class="ad-header">
        <span class="ad-label">Advertisement</span>
        <button v-if="canClose" class="close-btn" @click="closeAd">✕</button>
        <div v-else class="close-countdown">Close in {{ countdown }}s</div>
      </div>

      <!-- Ad Content -->
      <div class="ad-body">
        <img
          :src="gifUrl"
          alt="Farm Merge Valley Ad"
          class="ad-gif"
        />

        <div class="ad-text">
          <p class="ad-title">{{ title }}</p>
          <p class="ad-subtitle">{{ subtitle }}</p>
        </div>

        <button class="cta-btn" @click="onCtaClick">
          {{ ctaText }}
        </button>
      </div>

      <!-- Ad Footer -->
      <div class="ad-footer">
        <span>Sponsored · alpacagram.hawktwah</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'

export default defineComponent({
  name: 'FakeAd',

  props: {
    gifUrl: {
      type: String,
      default: 'https://media1.tenor.com/m/p_owYEtun7QAAAAd/farm-merge-valley-farm-merge.gif',
    },
    title: {
      type: String,
      default: '🌾 Alpaca Farm',
    },
    subtitle: {
      type: String,
      default: 'Enjoy all the alpacas and none of the spit!    Play FREE now.',
    },
    ctaText: {
      type: String,
      default: 'PLAY FREE NOW',
    },
    closableAfter: {
      type: Number,
      default: 3, // seconds before close button appears
    },
    autoClose: {
      type: Number,
      default: 5, // 0 = no auto close; set seconds to enable
    },
  },

  emits: ['close', 'cta-click'],

  setup(props, { emit }) {
    const visible = ref(true)
    const countdown = ref(props.closableAfter)
    const canClose = ref(props.closableAfter === 0)

    let countdownTimer: ReturnType<typeof setInterval> | null = null
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

    const closeAd = () => {
      visible.value = false
      emit('close')
    }

    const onCtaClick = () => {
      emit('cta-click')
    }

    onMounted(() => {
      if (props.closableAfter > 0) {
        countdownTimer = setInterval(() => {
          countdown.value--
          if (countdown.value <= 0) {
            canClose.value = true
            clearInterval(countdownTimer!)
          }
        }, 1000)
      }

      if (props.autoClose > 0) {
        autoCloseTimer = setTimeout(() => closeAd(), props.autoClose * 1000)
      }
    })

    onUnmounted(() => {
      if (countdownTimer) clearInterval(countdownTimer)
      if (autoCloseTimer) clearTimeout(autoCloseTimer)
    })

    return { visible, countdown, canClose, closeAd, onCtaClick }
  },
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@400;700;900&display=swap');

.fake-ad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.3s ease;
}

.fake-ad-container { /*here*/
  width: min(410px, 94vw);
  background: linear-gradient(160deg, #fffbe8 0%, #fff3c4 100%);
  border-radius: 24px;
  /*up*/
  overflow: hidden;
  box-shadow:
    0 0 0 3px #f4a800,
    0 0 0 6px #fff3c4,
    0 20px 60px rgba(0, 0, 0, 0.5);
  font-family: 'Nunito', sans-serif;
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Header */
.ad-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f4a800;
  padding: 8px 14px;
}

.ad-label {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #5a3200;
  opacity: 0.75;
}

.close-btn {
  background: #fff;
  border: 2px solid #5a3200;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  color: #5a3200;
  line-height: 1;
  transition: transform 0.15s, background 0.15s;
}
.close-btn:hover {
  background: #5a3200;
  color: #fff;
  transform: scale(1.1);
}

.close-countdown {
  font-size: 12px;
  font-weight: 700;
  color: #5a3200;
  background: rgba(255,255,255,0.5);
  padding: 3px 10px;
  border-radius: 20px;
}

/* Body */
.ad-body {
  padding: 20px 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.ad-gif {
  width: 100%;
  /*here*/
  max-height: 420px;
  object-fit: contain;
  border-radius: 12px;
  border: 3px solid #f4a800;
  box-shadow: 0 4px 16px rgba(244, 168, 0, 0.35);
}

.ad-text {
  text-align: center;
}

.ad-title {
  font-family: 'Lilita One', cursive;
  font-size: 22px;
  color: #3a1f00;
  margin: 0 0 4px;
  text-shadow: 0 2px 0 rgba(255,255,255,0.7);
}

.ad-subtitle {
  font-size: 14px;
  font-weight: 700;
  color: #7a4d00;
  margin: 0;
}

.cta-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(180deg, #5bce3a 0%, #3aad1e 100%);
  border: none;
  border-bottom: 5px solid #267a0f;
  border-radius: 14px;
  font-family: 'Lilita One', cursive;
  font-size: 18px;
  color: #fff;
  letter-spacing: 1px;
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0,0,0,0.25);
  box-shadow: 0 4px 12px rgba(58, 173, 30, 0.4);
  transition: transform 0.1s, border-bottom-width 0.1s;
}
.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(58, 173, 30, 0.5);
}
.cta-btn:active {
  transform: translateY(2px);
  border-bottom-width: 2px;
}

/* Footer */
.ad-footer {
  background: #f0d98a;
  text-align: center;
  padding: 6px;
  font-size: 10px;
  color: #8a6500;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0 }
  to   { opacity: 1 }
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.75) }
  to   { opacity: 1; transform: scale(1) }
}
</style>