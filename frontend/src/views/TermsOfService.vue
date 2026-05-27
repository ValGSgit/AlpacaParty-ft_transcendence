<!--
  Terms of Service — AlpacaParty
-->
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const sections = [
  { id: 'acceptance',   title: '1. Acceptance of Terms' },
  { id: 'description',  title: '2. Description of Service' },
  { id: 'accounts',     title: '3. User Accounts' },
  { id: 'conduct',      title: '4. Acceptable Use' },
  { id: 'content',      title: '5. User-Generated Content' },
  { id: 'economy',      title: '6. Game Economy' },
  { id: 'privacy',      title: '7. Privacy' },
  { id: 'termination',  title: '8. Suspension & Termination' },
  { id: 'disclaimers',  title: '9. Disclaimers' },
  { id: 'liability',    title: '10. Limitation of Liability' },
  { id: 'changes',      title: '11. Modifications' },
  { id: 'governing',    title: '12. Governing Law' },
  { id: 'contact',      title: '13. Contact' },
]

const activeId = ref(sections[0].id)
const showToTop = ref(false)
let observer = null

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
function jumpTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function onScroll() { showToTop.value = window.scrollY > 600 }

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
</script>

<template>
  <main class="doc-page">
    <div class="doc-shell">
      <aside class="doc-toc" aria-label="On this page">
        <h2>On this page</h2>
        <ol>
          <li v-for="s in sections" :key="s.id">
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
          <span class="doc-eyebrow">Legal</span>
          <h1 class="doc-title">Terms of Service</h1>
          <p class="doc-lede">
            The rules of the room. By using AlpacaParty you agree to these terms.
          </p>
          <span class="doc-meta">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3.5" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
              <path d="M2 6.5h12M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            Last updated · April 7, 2026
          </span>
        </header>

        <div class="doc-jump">
          <label for="doc-jump-select">Jump to</label>
          <select
            id="doc-jump-select"
            @change="(e) => { jumpTo(e.target.value); e.target.value = '' }"
          >
            <option value="" disabled selected>Choose a section…</option>
            <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>

        <section id="acceptance">
          <h2>1. Acceptance of Terms <a class="doc-anchor" href="#acceptance">#</a></h2>
          <p>
            By accessing or using <strong>AlpacaParty</strong> ("the Service"), you agree to be
            bound by these Terms of Service ("Terms"). If you do not agree, please do not use the
            Service.
          </p>
        </section>

        <section id="description">
          <h2>2. Description of Service <a class="doc-anchor" href="#description">#</a></h2>
          <p>
            AlpacaParty is a social web application that lets users raise and customise a virtual
            alpaca farm, interact with other users through messaging, posts,
            and earn achievements. The Service is provided as-is for educational and entertainment
            purposes as part of the 42 <em>ft_transcendence</em> project.
          </p>
        </section>

        <section id="accounts">
          <h2>3. User Accounts <a class="doc-anchor" href="#accounts">#</a></h2>
          <ul>
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your credentials.</li>
            <li>You must be at least 16 years old to create an account (GDPR Art. 8).</li>
            <li>One person may register only one account. Multiple accounts per person are not allowed.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>
        </section>

        <section id="conduct">
          <h2>4. Acceptable Use <a class="doc-anchor" href="#conduct">#</a></h2>
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or to promote illegal activity.</li>
            <li>Harass, abuse, threaten, or impersonate other users.</li>
            <li>Post content that is hateful, violent, sexually explicit, or otherwise objectionable.</li>
            <li>Attempt to gain unauthorised access to other accounts, servers, or data.</li>
            <li>Interfere with the normal operation of the Service, including exploiting bugs
                or using automated scripts to gain an unfair advantage in the game.</li>
            <li>Upload malicious code, viruses, or any material designed to disrupt the Service.</li>
            <li>Scrape, crawl, or collect data from the Service without explicit permission.</li>
          </ul>
        </section>

        <section id="content">
          <h2>5. User-Generated Content <a class="doc-anchor" href="#content">#</a></h2>
          <p>
            You retain ownership of content you create (posts, messages, profile information).
            By posting content on AlpacaParty, you grant us a non-exclusive, royalty-free licence
            to store, display, and distribute that content within the Service. We may remove any
            content that violates these Terms.
          </p>
        </section>

        <section id="economy">
          <h2>6. Game Economy <a class="doc-anchor" href="#economy">#</a></h2>
          <p>
            In-game currency ("coins") and items (alpacas, farm upgrades) have no real-world
            monetary value. We reserve the right to adjust the game economy, reset progress, or
            modify game mechanics at any time.
          </p>
        </section>

        <section id="privacy">
          <h2>7. Privacy <a class="doc-anchor" href="#privacy">#</a></h2>
          <p>
            Your use of the Service is also governed by our
            <router-link to="/privacy">Privacy Policy</router-link>, which describes how we
            collect, use, and protect your personal data.
          </p>
        </section>

        <section id="termination">
          <h2>8. Account Suspension &amp; Termination <a class="doc-anchor" href="#termination">#</a></h2>
          <p>
            We may suspend or terminate your account at our discretion if you violate these Terms.
            You may delete your account at any time from the
            <router-link to="/settings">Settings</router-link> page. Upon deletion, your personal
            data will be removed in accordance with our Privacy Policy.
          </p>
        </section>

        <section id="disclaimers">
          <h2>9. Disclaimers <a class="doc-anchor" href="#disclaimers">#</a></h2>
          <ul>
            <li>The Service is provided <strong>"as is"</strong> without warranties of any kind, express or implied.</li>
            <li>We do not guarantee uninterrupted or error-free operation.</li>
            <li>We are not liable for any data loss, including loss of game progress.</li>
          </ul>
        </section>

        <section id="liability">
          <h2>10. Limitation of Liability <a class="doc-anchor" href="#liability">#</a></h2>

          <aside class="callout callout--warning" role="note">
            <span class="callout__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3l10 18H2L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M12 10v4.5M12 17v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </span>
            <div class="callout__body">
              <h3 class="callout__title">Limitation of liability</h3>
              <p>
                To the maximum extent permitted by law, AlpacaParty and its contributors shall not
                be liable for any indirect, incidental, special, or consequential damages arising
                from your use of the Service, including loss of profits, revenues, data, or
                goodwill.
              </p>
            </div>
          </aside>
        </section>

        <section id="changes">
          <h2>11. Modifications <a class="doc-anchor" href="#changes">#</a></h2>
          <p>
            We reserve the right to update these Terms at any time. Changes take effect when
            posted on this page. Continued use of the Service after changes constitutes acceptance
            of the revised Terms.
          </p>
        </section>

        <section id="governing">
          <h2>12. Governing Law <a class="doc-anchor" href="#governing">#</a></h2>
          <p>
            These Terms are governed by the laws of the <strong>European Union</strong> and,
            where applicable, the laws of <strong>Spain</strong> (the jurisdiction in which
            this project is hosted and operated). Any disputes arising from or in connection
            with these Terms shall be submitted to the exclusive jurisdiction of the competent
            courts of Spain, without prejudice to your right as an EU consumer to bring
            proceedings before the courts of your country of domicile.
          </p>
        </section>

        <section id="contact">
          <h2>13. Contact <a class="doc-anchor" href="#contact">#</a></h2>
          <p>
            For questions about these Terms, please use the
            <router-link to="/help">Help</router-link> page to contact the AlpacaParty team.
          </p>
        </section>

        <footer class="doc-footer">
          <span>Last updated · April 7, 2026</span>
          <span class="sep">·</span>
          <router-link to="/help">contact</router-link>
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
