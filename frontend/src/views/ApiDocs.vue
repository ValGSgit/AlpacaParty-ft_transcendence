<template>
  <div :class="['docs-page', { 'docs-page--wide': activeTab === 'arch' }]">

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        :class="['tab-btn', { active: activeTab === 'api' }]"
        @click="activeTab = 'api'"
      >
        <span class="tab-icon">{ }</span> Public API
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'arch' }]"
        @click="activeTab = 'arch'"
      >
        <span class="tab-icon">⬡</span> Architecture Map
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!--  TAB 1 · Public API                                     -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'api'">

      <!-- Hero -->
      <div class="docs-hero">
        <div class="docs-icon">{ }</div>
        <h1>AlpacaParty Public API</h1>
        <p class="docs-subtitle">
          A secured, rate-limited REST API for reading platform data and performing
          service-level writes. Every request requires an <code>X-API-Key</code> header.
        </p>
        <a href="/api/docs/public" target="_blank" rel="noopener" class="btn-primary">
          Open Interactive Swagger UI <span class="arrow">&rarr;</span>
        </a>
      </div>

      <!-- Getting started -->
      <section class="docs-section">
        <h2>Getting Started</h2>
        <ol class="steps">
          <li>
            <strong>Log in</strong> to your AlpacaParty account.
          </li>
          <li>
            Go to <router-link to="/profile" class="inline-link">Profile &rarr; Settings &rarr; Public API Key</router-link>
            and click <strong>Generate Key</strong>.
          </li>
          <li>
            Copy the key — it starts with <code>ap_</code> followed by a 32-character hex string.
            You can reveal, regenerate, or revoke it at any time from the same page.
          </li>
          <li>
            Add the key as a header on every request:
            <div class="code-block"><pre>X-API-Key: ap_your_key_here</pre></div>
          </li>
        </ol>
      </section>

      <!-- Quick example -->
      <section class="docs-section">
        <h2>Quick Example</h2>
        <div class="code-block">
          <div class="code-label">curl</div>
          <pre>curl https://your-host/api/public/users \
  -H "X-API-Key: ap_your_key_here"</pre>
        </div>
        <div class="code-block" style="margin-top:0.75rem">
          <div class="code-label">fetch (JS)</div>
          <pre>const res = await fetch('/api/public/users?limit=10', {
  headers: { 'X-API-Key': 'ap_your_key_here' },
});
const { users } = await res.json();</pre>
        </div>
      </section>

      <!-- Base URL & auth -->
      <section class="docs-section">
        <h2>Base URL &amp; Authentication</h2>
        <table class="info-table">
          <tbody>
            <tr><td class="info-key">Base URL</td><td><code>/api/public</code></td></tr>
            <tr><td class="info-key">Auth header</td><td><code>X-API-Key: &lt;your-key&gt;</code></td></tr>
            <tr><td class="info-key">Rate limit</td><td>30 requests / minute per key</td></tr>
            <tr><td class="info-key">Content-Type</td><td><code>application/json</code></td></tr>
          </tbody>
        </table>
      </section>

      <!-- Endpoints -->
      <section class="docs-section">
        <h2>Endpoints</h2>

        <div class="endpoint-group">
          <h3>Users</h3>
          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method get">GET</span>
              <code class="path">/api/public/users</code>
            </div>
            <p>List public user profiles. Private profiles are excluded automatically.</p>
            <div class="param-table-wrap">
              <table class="param-table">
                <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>search</code></td><td>string</td><td>—</td><td>Filter by username prefix</td></tr>
                  <tr><td><code>limit</code></td><td>integer</td><td>20</td><td>Max results (1–100)</td></tr>
                  <tr><td><code>offset</code></td><td>integer</td><td>0</td><td>Results to skip</td></tr>
                  <tr><td><code>anonymized</code></td><td>bool</td><td>false</td><td>Replace names/avatars with placeholders</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method get">GET</span>
              <code class="path">/api/public/users/:id</code>
            </div>
            <p>Get a single public profile by user ID. Returns 404 if the profile is private or the user does not exist.</p>
            <div class="param-table-wrap">
              <table class="param-table">
                <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>anonymized</code></td><td>bool</td><td>false</td><td>Anonymize response fields</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="endpoint-group">
          <h3>Posts</h3>
          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method get">GET</span>
              <code class="path">/api/public/posts</code>
            </div>
            <p>Public feed posts. Viewer-specific flags (<code>user_liked</code>) are never included in API key responses.</p>
            <div class="param-table-wrap">
              <table class="param-table">
                <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>limit</code></td><td>integer</td><td>20</td><td>Max results</td></tr>
                  <tr><td><code>offset</code></td><td>integer</td><td>0</td><td>Results to skip</td></tr>
                  <tr><td><code>anonymized</code></td><td>bool</td><td>false</td><td>Anonymize author info and content</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method post">POST</span>
              <code class="path">/api/public/posts</code>
            </div>
            <p>Create a post on behalf of a user. Intended for server-to-server integrations — the caller must supply <code>authorId</code>.</p>
            <div class="param-table-wrap">
              <table class="param-table">
                <thead><tr><th>Body field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>authorId</code></td><td>integer</td><td>yes</td><td>User ID to post as</td></tr>
                  <tr><td><code>content</code></td><td>string</td><td>yes</td><td>Post text (max 2000 chars)</td></tr>
                  <tr><td><code>imageUrl</code></td><td>string</td><td>no</td><td>Optional image URL</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method put">PUT</span>
              <code class="path">/api/public/posts/:id</code>
            </div>
            <p>Update any post by ID. No ownership restriction — API key callers act at service level.</p>
          </div>

          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method delete">DELETE</span>
              <code class="path">/api/public/posts/:id</code>
            </div>
            <p>Delete any post by ID. No ownership restriction.</p>
          </div>
        </div>

        <div class="endpoint-group">
          <h3>Discovery</h3>
          <div class="endpoint-card">
            <div class="endpoint-header">
              <span class="method get">GET</span>
              <code class="path">/api/public/</code>
            </div>
            <p>Self-describing endpoint listing — <strong>no API key required</strong>. Returns the API name, version, auth scheme, rate limit, and the list of available endpoints with their parameters.</p>
          </div>
        </div>
      </section>

      <!-- Error responses -->
      <section class="docs-section">
        <h2>Error Responses</h2>
        <p class="section-note">All errors follow the same envelope shape:</p>
        <div class="code-block">
          <pre>{ "error": { "message": "Human-readable description" } }</pre>
        </div>
        <table class="info-table" style="margin-top:1rem">
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>401</code></td><td>Missing or invalid <code>X-API-Key</code> header</td></tr>
            <tr><td><code>404</code></td><td>Resource not found or profile is private</td></tr>
            <tr><td><code>429</code></td><td>Rate limit exceeded — back off and retry</td></tr>
            <tr><td><code>400</code></td><td>Validation error (missing required body fields)</td></tr>
          </tbody>
        </table>
      </section>

      <!-- Key management -->
      <section class="docs-section">
        <h2>API Key Management</h2>
        <p class="section-note">
          Keys are scoped to your account. One key per user — generating a new one immediately invalidates the previous one.
        </p>
        <table class="info-table">
          <thead><tr><th>Action</th><th>Where</th></tr></thead>
          <tbody>
            <tr>
              <td>Generate or regenerate a key</td>
              <td><router-link to="/profile" class="inline-link">Profile &rarr; Settings &rarr; Public API Key &rarr; Generate Key</router-link></td>
            </tr>
            <tr>
              <td>View your current key</td>
              <td>Same page — click <strong>Reveal</strong></td>
            </tr>
            <tr>
              <td>Revoke a key</td>
              <td>Same page — click <strong>Revoke</strong></td>
            </tr>
            <tr>
              <td>REST (programmatic)</td>
              <td><code>POST /api/users/me/api-key</code>, <code>GET /api/users/me/api-key</code>, <code>DELETE /api/users/me/api-key</code> — requires JWT</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Swagger link -->
      <div class="swagger-cta">
        <p>For full schema definitions, request/response examples, and a live request builder:</p>
        <a href="/api/docs/public" target="_blank" rel="noopener" class="btn-primary">
          Open Swagger UI <span class="arrow">&rarr;</span>
        </a>
      </div>

    </template>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!--  TAB 2 · Architecture Map                               -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <template v-else>
      <div class="arch-map">
        <div class="arch-grid-bg"></div>

        <header class="am-head">
          <div class="am-brand">
            <span class="am-mark"><AppIcon name="alpaca" :size="36" /></span>
            <div class="am-titles">
              <h1>AlpacaParty · Architecture Map</h1>
              <p>System blueprint · production stack</p>
            </div>
          </div>
          <div class="am-meta">
            <div><b>alpacaparty_net</b> · 6 services · 2 namespaces</div>
            <div class="am-legend">
              <span class="am-lg am-lg--http">HTTPS</span>
              <span class="am-lg am-lg--ws">WebSocket</span>
              <span class="am-lg am-lg--int">internal</span>
              <span class="am-lg am-lg--ext">external</span>
              <span class="am-lg am-lg--db">data</span>
            </div>
          </div>
        </header>

        <div class="am-layout">

          <!-- LEFT COLUMN -->
          <div class="am-left">

            <!-- 01 Infrastructure -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">01</span>
                <h2>Infrastructure</h2>
                <span class="am-card-sub">docker-compose · alpacaparty_net</span>
              </div>
              <div class="am-infra">
                <div class="am-lane">
                  <div class="am-lane-label">Edge</div>
                  <div class="am-lane-row">
                    <div class="am-node am-node--edge">
                      <span class="am-dot" style="background:#00f0ff"></span>
                      <div class="am-node-name">Browser <span class="am-tag">SPA</span></div>
                      <div class="am-node-desc">HTTPS / WSS client</div>
                    </div>
                    <div class="am-node am-node--edge">
                      <span class="am-dot" style="background:#00f0ff"></span>
                      <div class="am-node-name">nginx_prod <span class="am-tag">reverse-proxy</span></div>
                      <div class="am-node-desc">ModSecurity WAF · OWASP CRS 3.3.9 · rate-limit headers</div>
                      <div class="am-ports"><span>:8443</span><span>:8080</span></div>
                    </div>
                  </div>
                </div>
                <div class="am-connector"></div>
                <div class="am-lane">
                  <div class="am-lane-label">App</div>
                  <div class="am-lane-row">
                    <div class="am-node am-node--fe">
                      <span class="am-dot" style="background:#5b7cf6"></span>
                      <div class="am-node-name">frontend_prod <span class="am-tag">vite·vue3</span></div>
                      <div class="am-node-desc">Vue 3 SPA, built by Vite, served by inner nginx</div>
                    </div>
                    <div class="am-node am-node--be">
                      <span class="am-dot" style="background:#ff8ec4"></span>
                      <div class="am-node-name">backend_prod <span class="am-tag">express</span></div>
                      <div class="am-node-desc">Express + Socket.IO + Prisma ORM</div>
                      <div class="am-ports"><span>:3000</span></div>
                    </div>
                  </div>
                </div>
                <div class="am-connector"></div>
                <div class="am-lane">
                  <div class="am-lane-label">State</div>
                  <div class="am-lane-row">
                    <div class="am-node am-node--db">
                      <span class="am-dot" style="background:#36e07a"></span>
                      <div class="am-node-name">alpacaparty_db_prod <span class="am-tag">postgres·16</span></div>
                      <div class="am-node-desc">Primary store · accessed via Prisma</div>
                    </div>
                    <div class="am-node am-node--sec">
                      <span class="am-dot" style="background:#f5c842"></span>
                      <div class="am-node-name">vault_prod <span class="am-tag">hashi·vault</span></div>
                      <div class="am-node-desc">File backend · TLS · secrets at startup</div>
                      <div class="am-ports"><span>:8200</span></div>
                    </div>
                    <div class="am-node am-node--sec">
                      <span class="am-dot" style="background:#f5c842"></span>
                      <div class="am-node-name">vault-init <span class="am-tag">one-shot</span></div>
                      <div class="am-node-desc">init → unseal → seed → exit</div>
                    </div>
                  </div>
                </div>
                <div class="am-connector"></div>
                <div class="am-lane">
                  <div class="am-lane-label">External</div>
                  <div class="am-lane-row">
                    <div class="am-node am-node--ext">
                      <span class="am-dot" style="background:#f59e0b"></span>
                      <div class="am-node-name am-node-name--ext">Google OAuth 2.0</div>
                      <div class="am-node-desc">/auth/google · login redirect</div>
                    </div>
                    <div class="am-node am-node--ext">
                      <span class="am-dot" style="background:#f59e0b"></span>
                      <div class="am-node-name am-node-name--ext">GitHub OAuth 2.0</div>
                      <div class="am-node-desc">/auth/github · login redirect</div>
                    </div>
                    <div class="am-node am-node--ext">
                      <span class="am-dot" style="background:#f59e0b"></span>
                      <div class="am-node-name am-node-name--ext">Groq LLM API</div>
                      <div class="am-node-desc">/helpdesk/chat · 20 req/min</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 02 Request Pipeline -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">02</span>
                <h2>Request Pipeline</h2>
                <span class="am-card-sub">edge → nginx → middleware → controller</span>
              </div>
              <div class="am-pipe" style="margin-bottom:14px">
                <div class="am-step"><div class="am-step-lbl">Browser</div><div class="am-step-sub">HTTPS</div></div>
                <span class="am-arrow">→</span>
                <div class="am-step"><div class="am-step-lbl">ModSecurity WAF</div><div class="am-step-sub">OWASP CRS 3.3.9</div></div>
                <span class="am-arrow">→</span>
                <div class="am-step"><div class="am-step-lbl">nginx routing</div><div class="am-step-sub">/api · /socket.io · /uploads · /*</div></div>
                <span class="am-arrow">→</span>
                <div class="am-step"><div class="am-step-lbl">backend :3000</div><div class="am-step-sub">express stack</div></div>
              </div>
              <div class="am-pipe">
                <div class="am-step"><div class="am-step-lbl">helmet</div><div class="am-step-sub">security headers</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">cookie-parser</div><div class="am-step-sub">jwt_token</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">cors</div><div class="am-step-sub">CORS_ORIGINS</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">rate-limit</div><div class="am-step-sub">per route</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">authenticate</div><div class="am-step-sub">cookie / Bearer</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">validate</div><div class="am-step-sub">express-validator</div></div>
                <span class="am-arrow">›</span>
                <div class="am-step"><div class="am-step-lbl">controller</div><div class="am-step-sub">→ errorHandler</div></div>
              </div>
            </section>

            <!-- 03 Backend API -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">03</span>
                <h2>Backend API</h2>
                <span class="am-card-sub">10 route groups</span>
              </div>
              <div class="am-routes">

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/auth</span><span class="am-rg-label">Auth</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-post">POST</span><span>/register · /login · /logout · /refresh</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/me</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/google → /google/callback</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/github → /github/callback</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/users</span><span class="am-rg-label">Users</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-mix">CRUD</span><span>/me</span></li>
                    <li><span class="am-verb am-v-put">PUT</span><span>/me/password</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/me/export <em class="am-note">GDPR</em></span></li>
                    <li><span class="am-verb am-v-mix">P·G</span><span>/me/delete-request · /me/data-requests</span></li>
                    <li><span class="am-verb am-v-mix">G·P·D</span><span>/me/api-key</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/ · /:id</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/posts</span><span class="am-rg-label">Posts</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-mix">G·P</span><span>/</span></li>
                    <li><span class="am-verb am-v-mix">CRUD</span><span>/:id</span></li>
                    <li><span class="am-verb am-v-mix">G·P</span><span>/:id/comments</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/user/:userId</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/friends</span><span class="am-rg-label">Friends</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-get">GET</span><span>/ · /online · /blocked</span></li>
                    <li><span class="am-verb am-v-del">DEL</span><span>/:id</span></li>
                    <li><span class="am-verb am-v-mix">G·P</span><span>/requests</span></li>
                    <li><span class="am-verb am-v-put">PUT</span><span>/requests/:id/accept|decline</span></li>
                    <li><span class="am-verb am-v-mix">P·D</span><span>/block · /block/:id</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/chat</span><span class="am-rg-label">Chat</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-get">GET</span><span>/conversations · /unread</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/dm/:userId</span></li>
                    <li><em class="am-note" style="margin:0">rooms via Socket.IO</em></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/game</span><span class="am-rg-label">Game</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-get">GET</span><span>/stats · /history</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/leaderboard · /leaderboard/coins</span></li>
                    <li><span class="am-verb am-v-mix">G·P</span><span>/farm</span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/achievements · /challenges</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/notifications</span><span class="am-rg-label">Notif</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-get">GET</span><span>/</span></li>
                    <li><span class="am-verb am-v-put">PUT</span><span>/:id/read · /read-all</span></li>
                    <li><span class="am-verb am-v-del">DEL</span><span>/:id</span></li>
                  </ul>
                </div>

                <div class="am-rg">
                  <div class="am-rg-head"><span class="am-prefix">/uploads</span><span class="am-rg-label">Uploads</span></div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-mix">G·P</span><span>/ <em class="am-note">multer · 10 MB</em></span></li>
                    <li><span class="am-verb am-v-del">DEL</span><span>/:id</span></li>
                  </ul>
                </div>

                <div class="am-rg am-rg--public">
                  <div class="am-rg-head">
                    <span class="am-prefix am-prefix--gold">/public</span>
                    <span class="am-rg-label">Public API</span>
                    <span class="am-badge am-badge--lock">🔑 X-API-Key</span>
                  </div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-get">GET</span><span>/ <em class="am-note">no key</em></span></li>
                    <li><span class="am-verb am-v-get">GET</span><span>/users · /users/:id · /posts</span></li>
                    <li><span class="am-verb am-v-mix">P·U·D</span><span>/posts · /posts/:id</span></li>
                  </ul>
                </div>

                <div class="am-rg am-rg--helpdesk">
                  <div class="am-rg-head">
                    <span class="am-prefix am-prefix--magenta">/helpdesk</span>
                    <span class="am-rg-label">AI Helpdesk</span>
                    <span class="am-badge">→ Groq · 20 req/min</span>
                  </div>
                  <ul class="am-rl">
                    <li><span class="am-verb am-v-post">POST</span><span>/chat <em class="am-note">Groq LLM completions</em></span></li>
                  </ul>
                </div>

              </div>
            </section>

            <!-- 04 Frontend Surface -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">04</span>
                <h2>Frontend Surface</h2>
                <span class="am-card-sub">Vue 3 + Vue Router + Pinia</span>
              </div>
              <div class="am-fe-tree">
                <div class="am-fe-col">
                  <h4>Auth</h4>
                  <div class="am-fe-item"><span class="am-fe-file">Login.vue</span><span class="am-fe-route">/login</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">Register.vue</span><span class="am-fe-route">/register</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">OAuthCallback.vue</span><span class="am-fe-route">/oauth-callback</span></div>
                </div>
                <div class="am-fe-col">
                  <h4>App</h4>
                  <div class="am-fe-item"><span class="am-fe-file">Game.vue</span><span class="am-fe-route">/</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">Feed.vue</span><span class="am-fe-route">/feed</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">Friends.vue</span><span class="am-fe-route">/friends</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">Messages.vue</span><span class="am-fe-route">/messages</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">Profile.vue</span><span class="am-fe-route">/profile</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">UserProfile.vue</span><span class="am-fe-route">/user/:id</span></div>
                </div>
                <div class="am-fe-col">
                  <h4>Info</h4>
                  <div class="am-fe-item"><span class="am-fe-file">ApiDocs.vue</span><span class="am-fe-route">/docs</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">PrivacyPolicy.vue</span><span class="am-fe-route">/privacy</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">TermsOfService.vue</span><span class="am-fe-route">/terms</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">NotFound.vue</span><span class="am-fe-route">*</span></div>
                </div>
                <div class="am-fe-col">
                  <h4>Globals · Game core</h4>
                  <div class="am-fe-item"><span class="am-fe-file">App.vue</span><span class="am-fe-desc">SVG sprite + layout</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">HelpDeskChat.vue</span><span class="am-fe-desc">floating AI chat</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">AppIcon.vue</span><span class="am-fe-desc">SVG sprite icon</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">stores/auth.js</span><span class="am-fe-desc">Pinia · user, token</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">games/core/</span><span class="am-fe-desc">engine, entities, save</span></div>
                  <div class="am-fe-item"><span class="am-fe-file">games/mini_games/</span><span class="am-fe-desc">SpitRoyale · AlpacaRoad</span></div>
                </div>
              </div>
            </section>

            <!-- 05 Database -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">05</span>
                <h2>Database · Prisma Schema</h2>
                <span class="am-card-sub">User-centred; <b style="color:#36e07a">1:1</b> · <b style="color:#00f0ff">1:N</b></span>
              </div>
              <div class="am-er">
                <div class="am-er-row">
                  <span class="am-er-lhs">User</span>
                  <span class="am-er-rhs">
                    <span class="am-chip"><span class="am-cn">1:1</span> UserAuth</span>
                    <span class="am-chip"><span class="am-cn">1:1</span> UserStats</span>
                    <span class="am-chip"><span class="am-cn">1:1</span> UserSettings</span>
                    <span class="am-chip"><span class="am-cn">1:0..1</span> PublicApi</span>
                  </span>
                </div>
                <div class="am-er-row">
                  <span class="am-er-lhs">Social</span>
                  <span class="am-er-rhs">
                    <span class="am-chip"><span class="am-cn">1:N</span> FriendRequest</span>
                    <span class="am-chip"><span class="am-cn">1:N</span> Friend</span>
                    <span class="am-chip"><span class="am-cn">1:N</span> BlockedUser</span>
                  </span>
                </div>
                <div class="am-er-row">
                  <span class="am-er-lhs">Posts</span>
                  <span class="am-er-rhs">
                    <span class="am-chip">User <span class="am-cn">1:N</span> Post</span>
                    <span class="am-chip">Post <span class="am-cn">1:N</span> Comment</span>
                    <span class="am-chip">Post <span class="am-cn">1:N</span> Like</span>
                  </span>
                </div>
                <div class="am-er-row">
                  <span class="am-er-lhs">Chat</span>
                  <span class="am-er-rhs">
                    <span class="am-chip">User <span class="am-cn">1:N</span> Message</span>
                    <span class="am-chip">User <span class="am-cn">1:N</span> ChatRoom</span>
                    <span class="am-chip">ChatRoom <span class="am-cn">1:N</span> Message</span>
                  </span>
                </div>
                <div class="am-er-row">
                  <span class="am-er-lhs">Game</span>
                  <span class="am-er-rhs">
                    <span class="am-chip">User <span class="am-cn">1:N</span> Game (p1·p2·winner)</span>
                    <span class="am-chip">User <span class="am-cn">1:N</span> UserAchievement</span>
                    <span class="am-chip">Achievement <span class="am-cn">1:N</span> UserAchievement</span>
                  </span>
                </div>
                <div class="am-er-row">
                  <span class="am-er-lhs">Account</span>
                  <span class="am-er-rhs">
                    <span class="am-chip">User <span class="am-cn">1:N</span> Notification</span>
                    <span class="am-chip">User <span class="am-cn">1:N</span> DataRequest</span>
                  </span>
                </div>
              </div>
            </section>

          </div><!-- /am-left -->

          <!-- RIGHT COLUMN -->
          <div class="am-right">

            <!-- 06 Realtime -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">06</span>
                <h2>Realtime · Socket.IO</h2>
                <span class="am-card-sub">2 namespaces</span>
              </div>
              <div class="am-rt">
                <div class="am-rt-row">
                  <div class="am-rt-side am-rt-side--client">
                    <div class="am-rt-ns">/ namespace</div>
                    <div class="am-rt-name">socket.io-client</div>
                    <div class="am-rt-desc">presence + DMs + notifications</div>
                  </div>
                  <div class="am-rt-link"><span class="am-pulse"></span></div>
                  <div class="am-rt-side am-rt-side--server">
                    <div class="am-rt-ns">socketService.js</div>
                    <div class="am-rt-name">/ namespace</div>
                    <div class="am-rt-desc">online tracking · dm:{min}-{max} · group rooms · notif push</div>
                  </div>
                </div>
                <div class="am-rt-row">
                  <div class="am-rt-side am-rt-side--client">
                    <div class="am-rt-ns">/minigames</div>
                    <div class="am-rt-name">GameClient.js</div>
                    <div class="am-rt-desc">lobby + per-match tick sync (Spit Royale + Alpaca Road)</div>
                  </div>
                  <div class="am-rt-link"><span class="am-pulse" style="animation-delay:.6s"></span></div>
                  <div class="am-rt-side am-rt-side--server">
                    <div class="am-rt-ns">MatchManager.js</div>
                    <div class="am-rt-name">/minigames</div>
                    <div class="am-rt-desc">dispatches SpitRoyalMatch / AlpacaRoadMatch · room sync + ticks</div>
                  </div>
                </div>
                <div class="am-rt-row am-rt-row--full">
                  <div class="am-rt-side am-rt-side--gold">
                    <div class="am-rt-ns">cross-cutting</div>
                    <div class="am-rt-name">socketAuthMiddleware</div>
                    <div class="am-rt-desc">verifies <code>jwt_token</code> cookie on every namespace · NotificationService pushes to user rooms on /</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 07 Secret Flow -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">07</span>
                <h2>Secret Flow</h2>
                <span class="am-card-sub">vault-init → vault → backend</span>
              </div>
              <div class="am-timeline">
                <div class="am-tl">
                  <div class="am-tl-who">vault-init</div>
                  <div class="am-tl-what">initialize vault — generate unseal key</div>
                </div>
                <div class="am-tl">
                  <div class="am-tl-who">vault-init</div>
                  <div class="am-tl-what">unseal vault</div>
                </div>
                <div class="am-tl">
                  <div class="am-tl-who">vault-init</div>
                  <div class="am-tl-what">seed secrets — DB pass · JWT · OAuth · Groq</div>
                </div>
                <div class="am-tl">
                  <div class="am-tl-who">vault-init</div>
                  <div class="am-tl-what">write <code>VAULT_TOKEN</code> → <code>vault_keys/keys.env</code>, exit (restart: no)</div>
                </div>
                <div class="am-tl am-tl--b">
                  <div class="am-tl-who">backend startup</div>
                  <div class="am-tl-what">read <code>VAULT_TOKEN</code> from <code>keys.env</code></div>
                </div>
                <div class="am-tl am-tl--b">
                  <div class="am-tl-who">backend startup</div>
                  <div class="am-tl-what">fetch all secrets from vault → <code>process.env</code></div>
                </div>
                <div class="am-tl am-tl--b">
                  <div class="am-tl-who">backend ready</div>
                  <div class="am-tl-what">Prisma connects · Express + Socket.IO listen on :3000</div>
                </div>
              </div>
            </section>

            <!-- 08 nginx Routing -->
            <section class="am-card">
              <div class="am-card-head">
                <span class="am-num">08</span>
                <h2>nginx Routing</h2>
                <span class="am-card-sub">match order</span>
              </div>
              <ul class="am-rl am-rl--nginx">
                <li><span class="am-verb am-v-mix">SPC</span><span>/api/users/me</span><em class="am-note">WAF bypass</em></li>
                <li><span class="am-verb am-v-get">→</span><span>/api/*</span><em class="am-note">backend:3000</em></li>
                <li><span class="am-verb am-v-post">⇅</span><span>/socket.io/*</span><em class="am-note">WS upgrade</em></li>
                <li><span class="am-verb am-v-get">→</span><span>/uploads/*</span><em class="am-note">backend:3000</em></li>
                <li><span class="am-verb am-v-get">→</span><span>/*</span><em class="am-note">frontend (SPA)</em></li>
              </ul>
            </section>

          </div><!-- /am-right -->

        </div><!-- /am-layout -->
      </div><!-- /arch-map -->
    </template>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppIcon from '../components/AppIcon.vue';
const activeTab = ref('api');
</script>

<style src="../styles/views/ApiDocs.css" scoped></style>
