<!--
  Privacy Policy — AlpacaParty
-->
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const sections = [
  { id: 'introduction',      title: '1. Introduction' },
  { id: 'data-controller',   title: '2. Data Controller' },
  { id: 'information',       title: '3. Information We Collect' },
  { id: 'how-we-use-it',     title: '4. How We Use Your Information' },
  { id: 'sharing',           title: '5. Data Sharing' },
  { id: 'transfers',         title: '6. International Transfers' },
  { id: 'retention',         title: '7. Data Retention' },
  { id: 'gdpr',              title: '8. Your Rights (GDPR)' },
  { id: 'cookies',           title: '9. Cookies' },
  { id: 'security',          title: '10. Security' },
  { id: 'children',          title: "11. Children's Privacy" },
  { id: 'changes',           title: '12. Changes to This Policy' },
  { id: 'contact',           title: '13. Contact Us' },
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
          <h1 class="doc-title">Privacy Policy</h1>
          <p class="doc-lede">
            What we collect, why we collect it, and what you can do about it.
            Plain language wherever possible.
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

        <section id="introduction">
          <h2>1. Introduction <a class="doc-anchor" href="#introduction">#</a></h2>
          <p>
            Welcome to <strong>AlpacaParty</strong> ("we", "us", "our"). We are committed to
            protecting your personal data and your right to privacy. This Privacy Policy explains
            what information we collect, how we use it, the legal basis for that use, and what
            rights you have in relation to it, in accordance with the
            <strong>General Data Protection Regulation (GDPR)</strong> (EU) 2016/679.
          </p>
        </section>

        <section id="data-controller">
          <h2>2. Data Controller <a class="doc-anchor" href="#data-controller">#</a></h2>
          <p>
            The data controller responsible for your personal data is the
            <strong>AlpacaParty development team</strong>, a student project group operating as
            part of the 42 School <em>ft_transcendence</em> curriculum.
          </p>
          <p>
            For all data-protection enquiries — including access requests, erasure, and
            complaints — please use the <router-link to="/help">Help</router-link> page or
            submit a formal data request directly from the
            <router-link to="/settings">Settings</router-link> page.
          </p>
          <p>
            We have not appointed a Data Protection Officer (DPO) because our processing does
            not meet the thresholds that require one under GDPR Art. 37.
          </p>
        </section>

        <section id="information">
          <h2>3. Information We Collect <a class="doc-anchor" href="#information">#</a></h2>
          <h3>3.1 Account Information</h3>
          <p>
            When you register, we collect a username, email address, and a hashed password.
            If you sign in via a third-party OAuth provider (e.g. Google, GitHub), we receive a
            limited profile (display name, avatar URL, and email) from that provider.
          </p>
          <h3>3.2 Profile Data</h3>
          <p>
            You may optionally provide a biography, status message, and upload a profile avatar.
            This data is stored on our servers and visible to other users according to your
            privacy settings.
          </p>
          <h3>3.3 Game &amp; Social Data</h3>
          <p>
            We store game progress (coins, farm state, achievements), friend lists, chat
            messages, and posts so you can access them across sessions.
          </p>
          <h3>3.4 Technical Data</h3>
          <p>
            We automatically collect minimal technical data including IP address, browser type, and
            timestamps of requests. This data is used solely for security, rate-limiting, and
            debugging.
          </p>
        </section>

        <section id="how-we-use-it">
          <h2>4. How We Use Your Information &amp; Legal Basis <a class="doc-anchor" href="#how-we-use-it">#</a></h2>
          <p>
            Every processing activity we carry out has a lawful basis under GDPR Art. 6.
            The table below lists each use and its corresponding basis.
          </p>
          <table>
            <thead>
              <tr>
                <th>Purpose</th>
                <th>Lawful basis (GDPR Art. 6)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Authenticate you and maintain your account</td>
                <td>Performance of a contract — Art. 6(1)(b)</td>
              </tr>
              <tr>
                <td>Enable social features (friends, messaging, posts)</td>
                <td>Performance of a contract — Art. 6(1)(b)</td>
              </tr>
              <tr>
                <td>Persist game progress and achievements</td>
                <td>Performance of a contract — Art. 6(1)(b)</td>
              </tr>
              <tr>
                <td>Send in-app notifications relevant to your activity</td>
                <td>Performance of a contract — Art. 6(1)(b)</td>
              </tr>
              <tr>
                <td>Security, rate-limiting, and abuse prevention (technical logs)</td>
                <td>Legitimate interests — Art. 6(1)(f): protecting the service and its users</td>
              </tr>
              <tr>
                <td>Comply with legal obligations</td>
                <td>Legal obligation — Art. 6(1)(c)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="sharing">
          <h2>5. Data Sharing <a class="doc-anchor" href="#sharing">#</a></h2>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal data with third parties.
            Data is shared only in the following limited circumstances:
          </p>
          <ul>
            <li>With other users, to the extent you make information public (profile, posts).</li>
            <li>With third-party OAuth providers (Google, GitHub) when you choose to sign in via them.</li>
            <li>When required by law or to protect the rights, safety, or property of AlpacaParty and its users.</li>
          </ul>
        </section>

        <section id="transfers">
          <h2>6. International Data Transfers <a class="doc-anchor" href="#transfers">#</a></h2>
          <p>
            If you authenticate using Google or GitHub OAuth, your login request is processed by
            those providers' servers, which may be located outside the European Economic Area (EEA).
            Both Google and GitHub have committed to the EU Standard Contractual Clauses (SCCs)
            and/or maintain adequacy decisions under GDPR Chapter V, providing appropriate
            safeguards for your data during such transfers. We do not independently transfer your
            personal data outside the EEA.
          </p>
        </section>

        <section id="retention">
          <h2>7. Data Retention <a class="doc-anchor" href="#retention">#</a></h2>
          <p>
            We retain your personal data for as long as your account is active. You may delete
            your account at any time from the <router-link to="/settings">Settings</router-link>
            page, after which your personal data will be permanently removed within 30 days.
            Server access logs (IP addresses, timestamps) used for security monitoring are
            retained for a maximum of 90 days.
          </p>
        </section>

        <section id="gdpr">
          <h2>8. Your Rights (GDPR) <a class="doc-anchor" href="#gdpr">#</a></h2>

          <aside class="callout callout--gdpr" role="note">
            <span class="callout__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"
                  stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M9 12.5l2 2 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="callout__body">
              <h3 class="callout__title">Your rights under the GDPR</h3>
              <p>
                Under GDPR Chapter III, you have the following rights. You can exercise them at
                any time by contacting us via the <router-link to="/help">Help</router-link>
                page.
              </p>
              <ul>
                <li><strong>Access (Art. 15)</strong> — request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification (Art. 16)</strong> — correct inaccurate or incomplete data.</li>
                <li><strong>Erasure (Art. 17)</strong> — request deletion of your data ("right to be forgotten").</li>
                <li>
                  <strong>Data portability (Art. 20)</strong> — export your data in a
                  machine-readable format. Available directly from the
                  <router-link to="/settings">Settings</router-link> page.
                </li>
                <li><strong>Object / Restrict (Arts. 18–21)</strong> — object to or restrict certain processing activities.</li>
                <li>
                  <strong>Withdraw consent</strong> — where processing is based on consent, you may
                  withdraw it at any time without affecting the lawfulness of prior processing.
                </li>
              </ul>
              <p>
                <strong>Right to lodge a complaint:</strong> If you believe we have handled your
                personal data unlawfully, you have the right to lodge a complaint with your national
                data-protection supervisory authority. Within the EU you can find your authority via
                the European Data Protection Board (EDPB) at
                <a href="https://www.edpb.europa.eu" target="_blank" rel="noopener noreferrer">edpb.europa.eu</a>.
              </p>
            </div>
          </aside>
        </section>

        <section id="cookies">
          <h2>9. Cookies <a class="doc-anchor" href="#cookies">#</a></h2>
          <p>
            AlpacaParty stores its session as a pair of <strong>HTTP-only cookies</strong>
            (an access token and a refresh token). The cookies are flagged
            <code>HttpOnly</code> (not readable from JavaScript), <code>Secure</code>
            (only sent over HTTPS), and <code>SameSite=Strict</code> (not sent on
            cross-site navigation). We do not use third-party tracking cookies or
            advertising scripts.
          </p>
          <p>
            Storing the session in HTTP-only cookies — rather than
            <code>localStorage</code> — protects the session token from being read by
            client-side JavaScript and therefore from theft via Cross-Site Scripting
            (XSS). You should still log out on shared or untrusted devices.
          </p>
        </section>

        <section id="security">
          <h2>10. Security <a class="doc-anchor" href="#security">#</a></h2>
          <p>
            We implement industry-standard measures to protect your data, including HTTPS/TLS
            encryption, bcrypt password hashing, input validation, rate limiting, and a Web
            Application Firewall (WAF). Despite best efforts, no system is 100&nbsp;% secure — please
            keep your credentials confidential.
          </p>
        </section>

        <section id="children">
          <h2>11. Children's Privacy <a class="doc-anchor" href="#children">#</a></h2>
          <p>
            GDPR Art. 8 sets the minimum age for consent to online services at <strong>16</strong>
            (member states may lower this to a minimum of 13). AlpacaParty requires users to be at
            least <strong>16 years old</strong>, in line with the GDPR default. We do not
            knowingly collect data from children below this age. If you believe we have, please
            contact us so we can promptly delete it.
          </p>
        </section>

        <section id="changes">
          <h2>12. Changes to This Policy <a class="doc-anchor" href="#changes">#</a></h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via an in-app notification. The "Last updated" date at the top of this
            page will always reflect the most recent revision. Continued use of the service after
            a change becomes effective constitutes acceptance of the revised policy.
          </p>
        </section>

        <section id="contact">
          <h2>13. Contact Us <a class="doc-anchor" href="#contact">#</a></h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our data-processing
            practices, please reach out via the
            <router-link to="/help">Help</router-link> page or submit a formal data request
            from <router-link to="/settings">Settings</router-link>.
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
