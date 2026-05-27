<!--
  Help & FAQ — AlpacaParty
  Static support page; the live LLM assistant ("Paca") is mounted globally
  via HelpDeskChat.vue for authenticated users.
-->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const supportEmail = 'support@alpacaparty.local'

const sections = [
  {
    id: 'getting-started',
    title: 'Getting started',
    body: 'Create an account, edit your profile, and manage friends.',
  },
  {
    id: 'playing-the-games',
    title: 'Playing the games',
    body: 'The farm, Spit Royale arena, and Alpaca Road racing.',
  },
  {
    id: 'privacy-data-gdpr',
    title: 'Privacy, data, and GDPR',
    body: 'Export your data, delete your account, and withdraw consent.',
  },
  {
    id: 'public-api',
    title: 'Public API',
    body: 'Programmatic access, API keys, and the Swagger UI.',
  },
  {
    id: 'contact',
    title: 'Still stuck?',
    body: 'Reach a human by email or open a GitHub issue.',
  },
]

const activeId = ref(sections[0].id)
const query = ref('')
const showToTop = ref(false)
let observer = null

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sections
  return sections.filter(s =>
    (s.title + ' ' + s.body).toLowerCase().includes(q)
  )
})

const hasResults = computed(() => filtered.value.length > 0)

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function jumpTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onScroll() {
  showToTop.value = window.scrollY > 600
}

async function rewireObserver() {
  if (observer) observer.disconnect()
  await nextTick()
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) activeId.value = visible[0].target.id
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: [0, 1] }
  )
  document.querySelectorAll('.doc-content section[id]').forEach(s => observer.observe(s))
}

onMounted(async () => {
  await rewireObserver()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  observer && observer.disconnect()
  window.removeEventListener('scroll', onScroll)
})

watch(query, async () => { await rewireObserver() })
</script>

<template>
  <main class="doc-page">
    <div class="doc-shell">
      <aside class="doc-toc" aria-label="On this page">
        <h2>On this page</h2>
        <ol>
          <li v-for="s in filtered" :key="s.id">
            <a
              :href="'#' + s.id"
              :class="{ 'is-active': activeId === s.id }"
              @click.prevent="jumpTo(s.id)"
            >{{ s.title }}</a>
          </li>
        </ol>
      </aside>

      <article class="doc-content">
        <header class="doc-header">
          <span class="doc-eyebrow">Help center</span>
          <h1 class="doc-title">How can we help?</h1>
          <p class="doc-lede">
            Guides, troubleshooting, and the answers that don't require a human.
            For everything else, our assistant Paca is one click away.
          </p>
          <span class="doc-meta">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3.5" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
              <path d="M2 6.5h12M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            Last updated · May 11, 2026
          </span>
        </header>

        <div class="doc-jump">
          <label for="doc-jump-select">Jump to</label>
          <select
            id="doc-jump-select"
            @change="(e) => { jumpTo(e.target.value); e.target.value = '' }"
          >
            <option value="" disabled selected>Choose a section…</option>
            <option v-for="s in filtered" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>

        <!-- assistant CTA: the page's visual anchor -->
        <aside class="callout callout--info callout--anchor" role="complementary">
          <span class="callout__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 14.5v-8Z"
                stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <circle cx="9" cy="10.5" r="1" fill="currentColor"/>
              <circle cx="12" cy="10.5" r="1" fill="currentColor"/>
              <circle cx="15" cy="10.5" r="1" fill="currentColor"/>
            </svg>
          </span>
          <div class="callout__body">
            <h2 class="callout__title">Ask Paca, the AlpacaParty assistant</h2>
            <p v-if="!authStore.isAuthenticated">
              <router-link to="/login">Sign in</router-link> or
              <router-link to="/register">create an account</router-link>
              to chat live with <strong>Paca</strong> — she can explain features,
              share alpaca facts, and walk you through the game.
            </p>
            <p v-else>
              Paca can answer most product questions instantly — account fixes,
              feature explanations, and the occasional alpaca fact. Click the
              alpaca button in the bottom-right corner of any page, or open her
              from here.
            </p>
            <div class="callout__actions">
              <a href="#contact" class="doc-btn doc-btn--ghost" @click.prevent="jumpTo('contact')">
                Talk to a human
              </a>
            </div>
          </div>
        </aside>

        <div class="doc-search" role="search">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="query"
            type="search"
            placeholder="Search help articles…"
            aria-label="Search help articles"
          />
        </div>

        <template v-if="hasResults">
          <section v-for="s in filtered" :key="s.id" :id="s.id">
            <h2>
              {{ s.title }}
              <a class="doc-anchor" :href="'#' + s.id" :aria-label="`Anchor link to ${s.title}`">#</a>
            </h2>

            <template v-if="s.id === 'getting-started'">
              <p>How to create your account, set up your profile, and start making friends.</p>
              <h3>Creating an account</h3>
              <p>
                Head to <router-link to="/register">Register</router-link> with an
                email and password, or sign in with Google or GitHub via the buttons
                on the <router-link to="/login">Login</router-link> page. OAuth
                accounts are linked automatically — you can also link them later from
                your profile.
              </p>
              <h3>Editing your profile</h3>
              <p>
                Open <router-link to="/profile">Profile</router-link> to update your
                username, bio, status, and avatar. Avatars accept common image
                formats up to 10&nbsp;MB.
              </p>
              <h3>Friends and online status</h3>
              <p>
                Use <router-link to="/friends">Friends</router-link> to send,
                accept, or decline friend requests. Friends' online status updates in
                real time, and you can start a direct message or game invite from
                their profile.
              </p>
            </template>

            <template v-else-if="s.id === 'playing-the-games'">
              <p>Three ways to play: raise your herd, climb the arena, or race for the line.</p>
              <h3>The farm</h3>
              <p>
                The home page is your 3D farm. Buy alpacas, raise a herd, decorate
                with trees and barns, and toggle through different times of day. Use
                the HUD on the right to open the shop, edit mode, or change the
                camera angle.
              </p>
              <h3>Spit Royale</h3>
              <p>
                A real-time multiplayer arena. Open the joystick icon on the farm
                HUD, pick <em>Spit Royale</em>, then either play solo against AI
                bots or jump into the online lobby for level-based matchmaking.
              </p>
              <h3>Alpaca Road</h3>
              <p>
                A separate racing game with its own matchmaking and history. Open
                the game menu, choose <em>Alpaca Road</em>, and create or join a
                public room. Supports up to four players per race.
              </p>
            </template>

            <template v-else-if="s.id === 'privacy-data-gdpr'">
              <p>Your data, your rules. Everything below is one or two clicks away.</p>
              <h3>Requesting your data</h3>
              <p>
                From <router-link to="/profile">Profile → Settings</router-link> you
                can export everything we store about you as JSON, CSV, or XML. The
                export is generated on demand and downloaded directly.
              </p>
              <h3>Deleting your account</h3>
              <p>
                The same settings panel includes a deletion request. Account
                deletion is subject to a short grace period during which the request
                can be cancelled. See the
                <router-link to="/privacy">Privacy Policy</router-link> for the full
                retention details and your rights under GDPR.
              </p>
              <h3>Withdrawing consent or filing a complaint</h3>
              <p>
                Email the team at
                <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
                with the subject line "GDPR request" and we will respond within 30
                days, as required by the regulation.
              </p>
            </template>

            <template v-else-if="s.id === 'public-api'">
              <p>
                Developers can interact with AlpacaParty data programmatically.
                Visit <router-link to="/docs">API Docs</router-link> for the full
                endpoint reference, authentication details (<code>X-API-Key</code>
                header), and the 30 requests/minute rate limit. The interactive
                Swagger UI for the internal API is available at
                <a href="/api/docs" target="_blank" rel="noopener">/api/docs</a>.
              </p>
            </template>

            <template v-else-if="s.id === 'contact'">
              <p>
                When the assistant can't help — reach out by email at
                <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>, or open
                an issue on
                <a href="https://github.com/ValGSgit/AlpacaParty/issues" target="_blank" rel="noopener">
                  our GitHub tracker</a>.
                For account-specific or sensitive matters, prefer email.
              </p>
            </template>
          </section>
        </template>

        <div v-else class="doc-empty">
          <strong>No results</strong>
          Try different keywords, or <a href="#" @click.prevent="query = ''">clear your search</a>.
        </div>

        <footer class="doc-footer">
          <span>Last updated · May 11, 2026</span>
          <span class="sep">·</span>
          <a :href="`mailto:${supportEmail}`">contact</a>
          <span class="sep">·</span>
          <a href="#" @click.prevent="scrollToTop">back to top</a>
        </footer>
      </article>
    </div>

    <button
      type="button"
      class="doc-totop"
      :class="{ 'is-visible': showToTop }"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 13V4M4 7.5L8 3.5l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </main>
</template>

<style scoped>
@import '@/styles/assets/docs-layout.css';
</style>
