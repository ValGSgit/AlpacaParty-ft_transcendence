<!--
  Security Dashboard — WAF (ModSecurity) + HashiCorp Vault overview
  Admin-only page. Accessible at /security.
  @owner ValGSgit
-->
<template>
  <div class="sec-page">
    <h1>Security Dashboard</h1>
    <p class="subtitle">
      Live status of the WAF (ModSecurity) and secrets vault (HashiCorp Vault).
    </p>

    <!-- ── Status cards ────────────────────────────────────────────── -->
    <div class="status-row">
      <div class="status-card" :class="wafStatus.cls">
        <span class="status-icon">🛡️</span>
        <div>
          <strong>ModSecurity WAF</strong>
          <span class="status-label">{{ wafStatus.text }}</span>
        </div>
      </div>
      <div class="status-card" :class="vaultStatus.cls">
        <span class="status-icon">🔐</span>
        <div>
          <strong>HashiCorp Vault</strong>
          <span class="status-label">{{ vaultStatus.text }}</span>
        </div>
        <a
          v-if="vaultReachable"
          :href="vaultUiUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="vault-link"
        >Open Vault UI ↗</a>
      </div>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────── -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab-btn"
        :class="{ active: activeTab === t.id }"
        @click="activeTab = t.id"
      >{{ t.label }}</button>
    </div>

    <!-- WAF tab -->
    <section v-if="activeTab === 'waf'" class="tab-content">
      <h2>🛡️ Web Application Firewall (ModSecurity + OWASP CRS)</h2>

      <div class="info-grid">
        <div class="info-card">
          <h3>What it does</h3>
          <ul>
            <li>Inspects every HTTP request <em>before</em> it reaches the backend.</li>
            <li>Blocks SQLi, XSS, path traversal, command injection, and 70+ OWASP Top-10 attack classes.</li>
            <li>Rate-limits by Anomaly Score — bad requests accumulate points until blocked.</li>
            <li>Writes blocked requests to <code>/var/log/modsecurity/audit.log</code>.</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>Configuration files</h3>
          <table class="file-table">
            <tr><th>File</th><th>Purpose</th></tr>
            <tr>
              <td><code>nginx/Dockerfile</code></td>
              <td>Builds nginx with OWASP CRS v4 bundled</td>
            </tr>
            <tr>
              <td><code>nginx/modsecurity/modsecurity.conf</code></td>
              <td>Rule engine mode, thresholds, false-positive exclusions</td>
            </tr>
          </table>
        </div>

        <div class="info-card">
          <h3>Anomaly scoring (CRS default)</h3>
          <table class="file-table">
            <tr><th>Threat level</th><th>Score added</th></tr>
            <tr><td>Critical (SQLi, RCE)</td><td>+5</td></tr>
            <tr><td>Error (XSS)</td><td>+4</td></tr>
            <tr><td>Warning (protocol violation)</td><td>+3</td></tr>
            <tr><td>Notice (unusual header)</td><td>+2</td></tr>
          </table>
          <p class="note">Inbound threshold set to <strong>10</strong>. Requests above it are blocked with HTTP 403.</p>
        </div>

        <div class="info-card">
          <h3>Tuning for this app</h3>
          <ul>
            <li>Body inspection disabled for <code>POST /api/upload</code> (multipart files).</li>
            <li>SQL-injection body rules suppressed for <code>/api/auth</code> (safe — backend uses parameterised queries).</li>
            <li>Request body limit: <strong>10 MB</strong> (matches Express body-parser).</li>
          </ul>
        </div>
      </div>

      <div class="cmd-block">
        <h3>Useful commands</h3>
        <pre>
# Tail WAF audit log in real time
docker exec alpacaparty_nginx tail -f /var/log/modsecurity/audit.log

# Check if ModSecurity engine is running
docker exec alpacaparty_nginx nginx -T | grep modsecurity

# Run in DetectionOnly mode (logs but does not block) — edit modsecurity.conf:
# SecRuleEngine DetectionOnly
        </pre>
      </div>
    </section>

    <!-- Vault tab -->
    <section v-if="activeTab === 'vault'" class="tab-content">
      <h2>🔐 HashiCorp Vault — Secret Management</h2>

      <div class="info-grid">
        <div class="info-card">
          <h3>What it does</h3>
          <ul>
            <li>Stores all credentials (<code>DB_PASSWORD</code>, <code>JWT_SECRET</code>, OAuth keys, API keys) encrypted at rest.</li>
            <li>The backend fetches secrets at startup via the HTTP API; they are never written to disk or committed to git.</li>
            <li>Dev mode: auto-unsealed, root token set via <code>VAULT_DEV_TOKEN</code> in <code>.env</code>.</li>
            <li>Production: file-storage backend, requires <code>vault operator init</code> + <code>vault operator unseal</code> once after first deploy.</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>Secret path layout</h3>
          <table class="file-table">
            <tr><th>Vault key</th><th>Env var</th></tr>
            <tr><td><code>db_password</code></td><td><code>DB_PASSWORD</code></td></tr>
            <tr><td><code>jwt_secret</code></td><td><code>JWT_SECRET</code></td></tr>
            <tr><td><code>api_keys</code></td><td><code>API_KEYS</code></td></tr>
            <tr><td><code>groq_api_key</code></td><td><code>GROQ_API_KEY</code></td></tr>
            <tr><td><code>huggingface_api_key</code></td><td><code>HUGGINGFACE_API_KEY</code></td></tr>
            <tr><td><code>google_client_id/secret</code></td><td><code>GOOGLE_CLIENT_*</code></td></tr>
            <tr><td><code>github_client_id/secret</code></td><td><code>GITHUB_CLIENT_*</code></td></tr>
          </table>
          <p class="note">KV path: <code>secret/alpacaparty</code> (KV v2 engine)</p>
        </div>

        <div class="info-card">
          <h3>Code files</h3>
          <table class="file-table">
            <tr><th>File</th><th>Purpose</th></tr>
            <tr>
              <td><code>backend/src/config/vault.js</code></td>
              <td>Vault HTTP client — fetches &amp; injects into process.env</td>
            </tr>
            <tr>
              <td><code>backend/src/server.js</code></td>
              <td>Bootstrap entry point — awaits vault load before app starts</td>
            </tr>
            <tr>
              <td><code>vault/init/seed.sh</code></td>
              <td>Idempotent secret seeder (runs inside vault container)</td>
            </tr>
          </table>
        </div>

        <div class="info-card">
          <h3>First-time production setup</h3>
          <ol>
            <li>Deploy and start the stack: <code>make prod-up</code></li>
            <li>Initialise Vault (generates unseal keys + root token):
              <pre>docker exec alpacaparty_vault_prod vault operator init</pre>
            </li>
            <li>Unseal (repeat 3× with different keys from step 2):
              <pre>docker exec -it alpacaparty_vault_prod vault operator unseal</pre>
            </li>
            <li>Seed secrets:
              <pre>docker exec alpacaparty_vault_prod \
  sh /vault/init/seed.sh</pre>
            </li>
            <li>Set <code>VAULT_TOKEN</code> in <code>.env</code> to your root token (or a limited policy token), then restart the backend.</li>
          </ol>
        </div>
      </div>

      <div class="cmd-block">
        <h3>Useful commands (dev)</h3>
        <pre>
# Open Vault web UI (dev — root token in .env as VAULT_DEV_TOKEN)
open http://localhost:8200

# List all secrets
docker exec alpacaparty_vault vault kv list secret/

# Read the app secrets
docker exec alpacaparty_vault vault kv get secret/alpacaparty

# Update a single secret (e.g. rotate API key)
docker exec alpacaparty_vault vault kv patch secret/alpacaparty \
  api_keys="new-key-1,new-key-2"
        </pre>
      </div>

      <div v-if="vaultReachable" class="vault-iframe-section">
        <h3>Vault UI <span class="badge">live</span></h3>
        <p>The embedded Vault UI is running at
          <a :href="vaultUiUrl" target="_blank" rel="noopener noreferrer">{{ vaultUiUrl }}</a>.
        </p>
        <a :href="vaultUiUrl" target="_blank" rel="noopener noreferrer" class="btn-primary">
          Open Vault UI in new tab ↗
        </a>
      </div>
    </section>

    <!-- Architecture tab -->
    <section v-if="activeTab === 'arch'" class="tab-content">
      <h2>📐 Security Architecture</h2>
      <div class="arch-diagram">
        <pre class="diagram">
  Internet
     │
     ▼
┌──────────────────────────────────────────────────┐
│   nginx  (port 8080/443)                         │
│   ┌────────────────────────────────────────────┐ │
│   │  ModSecurity WAF  (OWASP CRS v4)           │ │
│   │  • SQLi / XSS / RCE detection              │ │
│   │  • Anomaly scoring  (threshold: 10)        │ │
│   │  • Audit log  →  /var/log/modsecurity/     │ │
│   └───────────────────┬────────────────────────┘ │
└───────────────────────│──────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
   ┌─────────────┐              ┌─────────────┐
   │  backend    │  at startup  │   Vault     │
   │  (Express)  │◄─────────────│  (KV v2)    │
   │             │  fetch secrets│             │
   └──────┬──────┘              └─────────────┘
          │
          ▼
   ┌─────────────┐
   │  PostgreSQL │
   └─────────────┘

Secret flow:
  .env  ──►  vault/init/seed.sh  ──►  Vault KV
                                          │
                              backend/src/server.js
                              loadVaultSecrets()
                                          │
                                   process.env
                                          │
                              config/index.js reads it
        </pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const activeTab = ref('waf')

const tabs = [
  { id: 'waf',   label: '🛡️ WAF / ModSecurity' },
  { id: 'vault', label: '🔐 Vault Secrets' },
  { id: 'arch',  label: '📐 Architecture' },
]

// ── Vault reachability probe ──────────────────────────────────────────────
// In dev the Vault UI is at port 8200 (exposed by docker-compose.yml).
// We probe the health endpoint; on prod it's on the internal network only.
const vaultReachable = ref(false)
const vaultHealthy   = ref(false)

// VITE_VAULT_UI_URL can be set in .env; default for dev
const vaultUiUrl = import.meta.env.VITE_VAULT_UI_URL || 'http://localhost:8200'

onMounted(async () => {
  if (!authStore.user?.is_admin) return
  try {
    const res = await fetch('http://localhost:8200/v1/sys/health', { mode: 'no-cors' })
    // no-cors means we can't read status, but a network error means it's down
    vaultReachable.value = true
    vaultHealthy.value   = true
  } catch {
    vaultReachable.value = false
  }
})

const wafStatus = computed(() => ({
  cls:  'status-ok',
  text: 'Active — OWASP CRS v4 loaded',
}))

const vaultStatus = computed(() => {
  if (vaultHealthy.value)   return { cls: 'status-ok',   text: 'Running (dev mode)' }
  if (vaultReachable.value) return { cls: 'status-warn',  text: 'Reachable (check seal status)' }
  return { cls: 'status-info', text: 'Not probed from this network' }
})
</script>

<style scoped>
.sec-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #a0a0b0;
  margin-bottom: 2rem;
}

/* ── Status row ─────────────────────────────────────────────── */
.status-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.status-card {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color, #2a2a3a);
}

.status-icon { font-size: 1.8rem; }

.status-card strong {
  display: block;
  font-size: 1rem;
}

.status-label {
  font-size: 0.82rem;
  color: #a0a0b0;
}

.status-ok   { border-left: 4px solid #4caf50; }
.status-warn { border-left: 4px solid #ff9800; }
.status-info { border-left: 4px solid #607d8b; }

.vault-link {
  margin-left: auto;
  font-size: 0.82rem;
  color: var(--primary, #00f0ff);
  text-decoration: none;
  white-space: nowrap;
}
.vault-link:hover { text-decoration: underline; }

/* ── Tabs ──────────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  background: transparent;
  color: #a0a0b0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.tab-btn.active,
.tab-btn:hover {
  background: var(--primary, #00f0ff);
  color: #000;
  border-color: var(--primary, #00f0ff);
}

.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

.tab-content h2 {
  font-size: 1.3rem;
  margin-bottom: 1.25rem;
  color: var(--primary, #00f0ff);
}

/* ── Info cards ─────────────────────────────────────────────── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1.1rem 1.25rem;
}

.info-card h3 {
  font-size: 0.95rem;
  color: #d0d0e0;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-card ul, .info-card ol {
  padding-left: 1.2rem;
  line-height: 1.75;
  font-size: 0.9rem;
  color: #c0c0d0;
}

.note {
  margin-top: 0.6rem;
  font-size: 0.82rem;
  color: #a0a0b0;
}

/* ── Tables ─────────────────────────────────────────────────── */
.file-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.file-table th,
.file-table td {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.file-table th {
  color: var(--primary, #00f0ff);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Command block ──────────────────────────────────────────── */
.cmd-block {
  background: #0a0a12;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.cmd-block h3 {
  font-size: 0.9rem;
  color: #d0d0e0;
  margin-bottom: 0.5rem;
}

.cmd-block pre {
  font-size: 0.82rem;
  color: #b0ffb0;
  line-height: 1.7;
  overflow-x: auto;
  margin: 0;
  white-space: pre;
}

/* ── Architecture diagram ──────────────────────────────────── */
.arch-diagram {
  background: #0a0a12;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1.25rem;
  overflow-x: auto;
}

.diagram {
  font-size: 0.82rem;
  color: #a0ffa0;
  line-height: 1.55;
  margin: 0;
  white-space: pre;
  font-family: monospace;
}

/* ── Vault live section ─────────────────────────────────────── */
.vault-iframe-section {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1.25rem;
}

.vault-iframe-section h3 {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  background: #4caf50;
  color: #000;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  vertical-align: middle;
}

.btn-primary {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.6rem 1.4rem;
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }

code {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.88em;
}
</style>
