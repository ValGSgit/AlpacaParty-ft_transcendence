<template>
  <div class="helpdesk-root">
    <!-- Floating trigger button (hidden while chat is open; panel has its own close) -->
    <button
      v-if="!isOpen"
      class="helpdesk-fab"
      @click="toggleChat"
      title="Help Desk — Ask Paca!"
      aria-label="Open help desk chat"
    >
      <AppIcon name="alpaca" :size="32" />
    </button>

    <!-- Chat panel -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="helpdesk-panel" role="dialog" aria-label="Help Desk Chat">
        <div class="hd-header">
          <div class="hd-header-info">
            <span class="hd-avatar"><AppIcon name="alpaca" :size="28" /></span>
            <div>
              <div class="hd-title">Paca — Help Desk</div>
              <div class="hd-subtitle">Ask me anything about AlpacaParty!</div>
            </div>
          </div>
          <button class="hd-close" @click="isOpen = false" aria-label="Close">&times;</button>
        </div>

        <div class="hd-messages" ref="messagesEl">
          <div v-if="!messages.length" class="hd-welcome">
            <p>Hi! I'm <strong>Paca</strong>, your AlpacaParty guide. 🌿</p>
            <p>Ask me about the game, features, or even fun alpaca facts!</p>
            <div class="hd-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                class="hd-suggestion"
                @click="sendSuggestion(s)"
              >{{ s }}</button>
            </div>
          </div>

          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['hd-msg', msg.role]"
          >
            <span v-if="msg.role === 'assistant'" class="msg-avatar"><AppIcon name="alpaca" :size="22" /></span>
            <div class="msg-bubble">{{ msg.content }}</div>
          </div>

          <div v-if="loading" class="hd-msg assistant">
            <span class="msg-avatar"><AppIcon name="alpaca" :size="22" /></span>
            <div class="msg-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div v-if="error" class="hd-error">{{ error }}</div>

        <div class="hd-input-wrapper">
          <div class="hd-input-row">
            <textarea
              ref="inputEl"
              v-model="draft"
              class="hd-input"
              placeholder="Ask a question…"
              rows="1"
              :maxlength="MAX_CHARS"
              :disabled="loading"
              @keydown.enter.exact.prevent="send"
              @input="autoResize"
            />
            <button
              class="hd-send"
              :disabled="!draft.trim() || loading || draft.length > MAX_CHARS"
              @click="send"
              aria-label="Send"
            >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
            </svg>
          </button>
          </div>
          <div class="hd-char-counter" :class="{ 'hd-char-limit': draft.length >= MAX_CHARS * 0.9 }">
            {{ draft.length }}/{{ MAX_CHARS }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const MAX_CHARS = 2000
const MAX_HISTORY = 20

const isOpen = ref(false)
const draft = ref('')
const messages = ref([])
const loading = ref(false)
const error = ref('')
const messagesEl = ref(null)
const inputEl = ref(null)

const suggestions = [
  'How do I start playing?',
  'What is AlpacaFarm?',
  'Tell me an alpaca fact!',
  'How do I add friends?',
]

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputEl.value?.focus())
  }
}

function autoResize(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}

async function sendSuggestion(text) {
  draft.value = text
  await send()
}

async function send() {
  const text = draft.value.trim()
  if (!text || loading.value || text.length > MAX_CHARS) return

  error.value = ''
  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
  }
  loading.value = true
  scrollToBottom()

  const history = messages.value.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }))

  try {
    const resp = await fetch('/api/helpdesk/chat', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages: history }),
    })

    if (!resp.ok) {
      // Non-streaming error path: body is JSON, not SSE.
      const errBody = await resp.json().catch(() => null)
      throw new Error(errBody?.error?.message || `Request failed (${resp.status})`)
    }

    // Append an empty assistant message and let chunks fill it in.
    messages.value.push({ role: 'assistant', content: '' })
    const idx = messages.value.length - 1
    loading.value = false // typing bubble disappears the moment we have a real bubble

    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let streamError = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const evt of events) {
        const line = evt.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          reader.cancel().catch(() => {})
          break
        }
        try {
          const json = JSON.parse(payload)
          if (json.error) {
            streamError = json.error
            continue
          }
          if (json.content) {
            messages.value[idx] = {
              ...messages.value[idx],
              content: messages.value[idx].content + json.content,
            }
            scrollToBottom()
          }
        } catch {
          // Drop malformed frames; keep streaming.
        }
      }
    }

    if (streamError) {
      throw new Error('Stream interrupted, please try again.')
    }
    if (!messages.value[idx].content) {
      // Backend ended without emitting a single delta — treat as failure.
      messages.value.splice(idx, 1)
      throw new Error('No response from the assistant.')
    }
  } catch (err) {
    error.value = err?.message || 'Something went wrong. Please try again.'
    // Roll the user's outbound message back if the assistant placeholder
    // wasn't pushed (i.e. the failure was pre-stream).
    if (messages.value[messages.value.length - 1]?.role === 'user') {
      messages.value.pop()
    }
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.helpdesk-root {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 950;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

/* ── FAB button ──────────────────────────────────────────── */
.helpdesk-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--primary, #00f0ff);
  color: #000;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(0, 240, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}
.helpdesk-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(0, 240, 255, 0.5);
}
.helpdesk-fab.open {
  background: #2a2a3a;
  color: var(--text-secondary, #a0a0b0);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.fab-close { font-size: 1.4rem; line-height: 1; }

/* ── Chat panel ──────────────────────────────────────────── */
.helpdesk-panel {
  width: 340px;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────── */
.hd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary, #12121a);
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  flex-shrink: 0;
}
.hd-header-info { display: flex; align-items: center; gap: 0.65rem; }
.hd-avatar { font-size: 1.6rem; line-height: 1; }
.hd-title { font-size: 0.9rem; font-weight: 700; color: var(--primary, #00f0ff); }
.hd-subtitle { font-size: 0.72rem; color: var(--text-secondary, #a0a0b0); margin-top: 1px; }
.hd-close {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0b0);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
}
.hd-close:hover { color: var(--primary, #00f0ff); }

/* ── Messages area ───────────────────────────────────────── */
.hd-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
}

.hd-welcome {
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.85rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hd-welcome strong { color: var(--primary, #00f0ff); }

.hd-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.25rem;
}
.hd-suggestion {
  background: rgba(0, 240, 255, 0.07);
  border: 1px solid rgba(0, 240, 255, 0.2);
  color: var(--primary, #00f0ff);
  font-size: 0.75rem;
  padding: 0.3rem 0.65rem;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.hd-suggestion:hover { background: rgba(0, 240, 255, 0.15); }

/* ── Message bubbles ─────────────────────────────────────── */
.hd-msg {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
}
.hd-msg.user { flex-direction: row-reverse; }

.msg-avatar { font-size: 1.1rem; flex-shrink: 0; }

.msg-bubble {
  max-width: 80%;
  padding: 0.55rem 0.8rem;
  border-radius: 14px;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.hd-msg.assistant .msg-bubble {
  background: var(--bg-tertiary, #1a1a2a);
  color: var(--text-primary, #e8e8f0);
  border-bottom-left-radius: 4px;
}
.hd-msg.user .msg-bubble {
  background: var(--primary, #00f0ff);
  color: #000;
  border-bottom-right-radius: 4px;
}

/* ── Typing indicator ────────────────────────────────────── */
.msg-bubble.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.65rem 0.9rem;
}
.msg-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary, #a0a0b0);
  animation: blink 1.2s infinite;
}
.msg-bubble.typing span:nth-child(2) { animation-delay: 0.2s; }
.msg-bubble.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40%            { opacity: 1; }
}

/* ── Error banner ────────────────────────────────────────── */
.hd-error {
  padding: 0.5rem 1rem;
  font-size: 0.78rem;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.08);
  border-top: 1px solid rgba(255, 107, 107, 0.2);
  flex-shrink: 0;
}

/* ── Input row ───────────────────────────────────────────── */
.hd-input-wrapper {
  border-top: 1px solid var(--border-color, #2a2a3a);
  background: var(--bg-secondary, #12121a);
  flex-shrink: 0;
}
.hd-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem 0.35rem;
}
.hd-char-counter {
  text-align: right;
  font-size: 0.7rem;
  color: var(--text-secondary, #a0a0b0);
  padding: 0 0.75rem 0.4rem;
  transition: color 0.15s;
}
.hd-char-limit {
  color: #f87171;
}
.hd-input {
  flex: 1;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  color: var(--text-primary, #e8e8f0);
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  resize: none;
  overflow-y: hidden;
  line-height: 1.4;
  transition: border-color 0.15s;
  font-family: inherit;
}
.hd-input:focus {
  outline: none;
  border-color: var(--primary, #00f0ff);
}
.hd-input::placeholder { color: var(--text-secondary, #a0a0b0); }
.hd-input:disabled { opacity: 0.5; }

.hd-send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--primary, #00f0ff);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.hd-send:disabled { opacity: 0.35; cursor: default; }
.hd-send:not(:disabled):hover { opacity: 0.85; }

/* ── Slide animation ─────────────────────────────────────── */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 480px) {
  .helpdesk-root { bottom: 1rem; right: 1rem; }
  .helpdesk-panel { width: calc(100vw - 2rem); }
}
</style>
