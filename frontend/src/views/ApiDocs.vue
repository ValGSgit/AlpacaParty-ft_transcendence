<!--
  API Documentation — Public API guide + Architecture Map
  @owner ValGSgit
-->
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
        <a href="/api/docs" class="btn-primary">
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
            <p>Public feed posts. Viewer-specific flags (<code>user_liked</code>, <code>user_reposted</code>) are never included in API key responses.</p>
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
        <a href="/api/docs" class="btn-primary">
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
                    <li><span class="am-verb am-v-mix">G·P</span><span>/me/farmdata</span></li>
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
                    <li><span class="am-verb am-v-mix">P·D</span><span>/:id/like · /:id/repost</span></li>
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
                    <span class="am-chip">Post <span class="am-cn">1:N</span> Repost</span>
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
                <li><span class="am-verb am-v-mix">SPC</span><span>/api/users/me</span><em class="am-note">cache headers</em></li>
                <li><span class="am-verb am-v-mix">SPC</span><span>/api/users/me/farmdata</span><em class="am-note">cache headers</em></li>
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

<style scoped>
/* ── Page shell ── */
.docs-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 5rem;
  transition: max-width 0.2s ease;
}
.docs-page--wide {
  max-width: 1400px;
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 0;
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 1.1rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #707080;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  letter-spacing: 0.01em;
}
.tab-btn:hover { color: #a0a0b0; }
.tab-btn.active {
  color: var(--primary, #00f0ff);
  border-bottom-color: var(--primary, #00f0ff);
}
.tab-icon {
  font-size: 0.9em;
  opacity: 0.8;
}

/* ── Hero ── */
.docs-hero {
  text-align: center;
  margin-bottom: 3rem;
}
.docs-icon {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
  font-family: monospace;
  opacity: 0.8;
  margin-bottom: 0.75rem;
}
h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin: 0 0 0.75rem;
}
.docs-subtitle {
  color: #a0a0b0;
  font-size: 0.95rem;
  line-height: 1.65;
  max-width: 560px;
  margin: 0 auto 1.75rem;
}

/* ── Sections ── */
.docs-section { margin-bottom: 3rem; }
.docs-section h2 {
  font-size: 1.25rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.section-note {
  color: #a0a0b0;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

/* ── Steps ── */
.steps {
  padding-left: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: #c0c0d0;
  font-size: 0.93rem;
  line-height: 1.6;
}
.steps li strong { color: #e0e0f0; }

/* ── Code blocks ── */
.code-block {
  background: #0a0a12;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 0.75rem;
}
.code-label {
  padding: 0.25rem 0.75rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #707080;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  background: #0d0d16;
}
.code-block pre {
  margin: 0;
  padding: 0.85rem 1rem;
  font-size: 0.83rem;
  color: #a0ffa0;
  line-height: 1.65;
  overflow-x: auto;
  white-space: pre;
}

/* ── Info table ── */
.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.info-table th,
.info-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  color: #c0c0d0;
}
.info-table th {
  color: var(--primary, #00f0ff);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.info-key {
  color: #a0a0b0;
  white-space: nowrap;
  font-weight: 500;
}

/* ── Endpoint groups ── */
.endpoint-group { margin-bottom: 2rem; }
.endpoint-group h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #707080;
  margin-bottom: 0.75rem;
}
.endpoint-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.6rem;
}
.endpoint-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.method {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.method.get    { background: rgba(0, 240, 255, 0.15); color: #00f0ff; }
.method.post   { background: rgba(0, 255, 136, 0.15); color: #00ff88; }
.method.put    { background: rgba(255, 160, 0, 0.15);  color: #ffa000; }
.method.delete { background: rgba(255, 0, 110, 0.15);  color: #ff006e; }
.path {
  font-size: 0.9rem;
  color: #e0e0f0;
}
.endpoint-card p {
  font-size: 0.88rem;
  color: #a0a0b0;
  margin: 0 0 0.6rem;
  line-height: 1.5;
}
.endpoint-card p:last-child { margin-bottom: 0; }

/* ── Param table ── */
.param-table-wrap { overflow-x: auto; }
.param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  margin-top: 0.5rem;
}
.param-table th,
.param-table td {
  padding: 0.35rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.param-table th {
  color: #707080;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.param-table td { color: #c0c0d0; }

/* ── Swagger CTA ── */
.swagger-cta {
  text-align: center;
  padding: 2.5rem;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
}
.swagger-cta p {
  color: #a0a0b0;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

/* ── Shared ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0a0a12;
  background: var(--primary, #00f0ff);
  border: none;
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #33f5ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
}
.arrow {
  font-size: 1.1rem;
  transition: transform 0.2s;
}
.btn-primary:hover .arrow { transform: translateX(3px); }
.inline-link {
  color: var(--primary, #00f0ff);
  text-decoration: none;
}
.inline-link:hover { text-decoration: underline; }
code {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.88em;
  color: var(--primary, #00f0ff);
}

/* ══════════════════════════════════════════════════════════════
   ARCHITECTURE MAP
   All classes prefixed am- to avoid any global collisions
   ══════════════════════════════════════════════════════════════ */

.arch-map {
  position: relative;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "ss01","tnum";
}

/* subtle grid overlay */
.arch-grid-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right,  rgba(255,255,255,.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 80%);
}

/* header */
.am-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid #232a3a;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
.am-brand { display: flex; align-items: center; gap: 12px; }
.am-mark {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #5b7cf6, #00f0ff);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px;
  box-shadow: 0 0 0 1px rgba(0,240,255,.3), 0 10px 24px -8px rgba(91,124,246,.5);
}
.am-titles h1 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: #e8ecf3;
}
.am-titles p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #a0a8bc;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.am-meta {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 11px;
  color: #6a7388;
  letter-spacing: 0.04em;
  text-align: right;
}
.am-meta b { color: #a0a8bc; font-weight: 500; }
.am-legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.am-lg {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #a0a8bc;
  padding: 2px 7px 2px 6px;
  border-radius: 999px;
  border: 1px solid #232a3a;
  background: #11141c;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.am-lg::before {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.am-lg--http { color: #00f0ff; }
.am-lg--ws   { color: #ff8ec4; }
.am-lg--int  { color: #a0a8bc; }
.am-lg--ext  { color: #f59e0b; }
.am-lg--db   { color: #36e07a; }

/* 2-col layout */
.am-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1100px) {
  .am-layout { grid-template-columns: 1fr; }
}

/* card */
.am-card {
  background: linear-gradient(180deg, #11141c 0%, #0e1117 100%);
  border: 1px solid #232a3a;
  border-radius: 14px;
  padding: 14px 14px 12px;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px -28px rgba(0,0,0,.6);
}
.am-card + .am-card { margin-top: 16px; }

.am-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid #232a3a;
}
.am-card-head h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e8ecf3;
}
.am-num {
  width: 22px; height: 22px;
  border-radius: 6px;
  background: #161a24;
  border: 1px solid #232a3a;
  color: #a0a8bc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.am-card-sub {
  margin-left: auto;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: #6a7388;
}

/* ── Infrastructure ── */
.am-infra {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
.am-lane {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 14px;
  align-items: stretch;
}
.am-lane-label {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a7388;
  padding: 10px 0 0 6px;
  border-left: 2px solid #232a3a;
}
.am-lane-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
}
.am-connector {
  height: 28px;
  background: linear-gradient(to bottom, transparent 13px, #232a3a 13px, #232a3a 14px, transparent 14px);
  margin: -4px 0;
}

/* node */
.am-node {
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 10px;
  padding: 10px 12px;
  min-width: 130px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  transition: border-color .18s, transform .18s, box-shadow .25s;
}
.am-node:hover {
  border-color: #2e3650;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px -16px rgba(0,0,0,.7);
}
.am-dot {
  position: absolute;
  top: 10px; right: 10px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #a0a8bc;
}
.am-node-name {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.005em;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e8ecf3;
}
.am-node-name--ext::after {
  content: "↗";
  margin-left: 4px;
  color: #f59e0b;
  font-weight: 600;
}
.am-tag {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  color: #6a7388;
  background: rgba(255,255,255,.03);
  border: 1px solid #232a3a;
  padding: 1px 5px;
  border-radius: 4px;
}
.am-node-desc {
  font-size: 11px;
  color: #a0a8bc;
  line-height: 1.4;
}
.am-ports {
  margin-top: 4px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #6a7388;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.am-ports span {
  border: 1px solid #232a3a;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255,255,255,.02);
}
.am-node--edge { border-left: 2px solid #00f0ff; }
.am-node--fe   { border-left: 2px solid #5b7cf6; }
.am-node--be   { border-left: 2px solid #ff8ec4; }
.am-node--db   { border-left: 2px solid #36e07a; }
.am-node--sec  { border-left: 2px solid #f5c842; }
.am-node--ext  { border-left: 2px solid #f59e0b; }

/* ── Request pipeline ── */
.am-pipe {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-wrap: wrap;
}
.am-step {
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 90px;
}
.am-step-lbl {
  font-weight: 700;
  font-size: 11.5px;
  color: #e8ecf3;
}
.am-step-sub {
  font-size: 10px;
  color: #6a7388;
  font-family: ui-monospace, Menlo, monospace;
}
.am-arrow {
  align-self: center;
  padding: 0 6px;
  color: #2e3650;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 14px;
}

/* ── Routes ── */
.am-routes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 900px) { .am-routes { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .am-routes { grid-template-columns: 1fr; } }

.am-rg {
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color .15s, transform .15s;
}
.am-rg:hover { border-color: #2e3650; transform: translateY(-1px); }
.am-rg--public  { border-color: rgba(245,200,66,.4); }
.am-rg--helpdesk { grid-column: span 2; }

.am-rg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}
.am-rg-label { color: #e8ecf3; }
.am-prefix {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #00f0ff;
  background: rgba(0,240,255,.08);
  border: 1px solid rgba(0,240,255,.25);
  padding: 1px 6px;
  border-radius: 4px;
}
.am-prefix--gold {
  color: #f5c842;
  background: rgba(245,200,66,.08);
  border-color: rgba(245,200,66,.3);
}
.am-prefix--magenta {
  color: #ff8ec4;
  background: rgba(255,142,196,.08);
  border-color: rgba(255,142,196,.3);
}
.am-badge {
  margin-left: auto;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 9.5px;
  color: #6a7388;
  border: 1px solid #232a3a;
  padding: 1px 5px;
  border-radius: 4px;
}
.am-badge--lock {
  color: #f5c842;
  border-color: rgba(245,200,66,.4);
  background: rgba(245,200,66,.06);
}

.am-rl {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.am-rl li {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 11px;
  color: #a0a8bc;
  line-height: 1.45;
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.am-rl--nginx { gap: 6px; }
.am-verb {
  flex-shrink: 0;
  font-weight: 700;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 38px;
  text-align: center;
  background: rgba(255,255,255,.03);
  border: 1px solid #232a3a;
  color: #a0a8bc;
}
.am-v-get  { color: #36e07a !important; border-color: rgba(54,224,122,.3) !important; }
.am-v-post { color: #00f0ff !important; border-color: rgba(0,240,255,.3)  !important; }
.am-v-put  { color: #f5c842 !important; border-color: rgba(245,200,66,.3) !important; }
.am-v-del  { color: #ef4444 !important; border-color: rgba(239,68,68,.3)  !important; }
.am-v-mix  { color: #ff8ec4 !important; border-color: rgba(255,142,196,.3)!important; }
.am-note {
  color: #6a7388;
  margin-left: auto;
  font-size: 10px;
  font-style: normal;
}

/* ── Frontend tree ── */
.am-fe-tree {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 700px) { .am-fe-tree { grid-template-columns: 1fr; } }
.am-fe-col {
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.am-fe-col h4 {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a7388;
  font-weight: 700;
  border-bottom: 1px dashed #232a3a;
  padding-bottom: 6px;
}
.am-fe-item {
  display: grid;
  grid-template-columns: minmax(110px, max-content) 1fr;
  gap: 10px;
  align-items: baseline;
  font-size: 11.5px;
  padding: 2px 0;
}
.am-fe-file {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: #e8ecf3;
}
.am-fe-route {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10.5px;
  color: #00f0ff;
}
.am-fe-desc {
  color: #6a7388;
  font-size: 10.5px;
}

/* ── ER grid ── */
.am-er { display: grid; grid-template-columns: 1fr; gap: 6px; }
.am-er-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid #232a3a;
  border-radius: 8px;
  background: #161a24;
  font-size: 11.5px;
}
.am-er-lhs {
  font-weight: 700;
  color: #e8ecf3;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
}
.am-er-rhs { display: flex; flex-wrap: wrap; gap: 4px; }
.am-chip {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10.5px;
  color: #a0a8bc;
  border: 1px solid #232a3a;
  border-radius: 4px;
  padding: 1px 6px;
  background: rgba(255,255,255,.02);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.am-chip:hover { border-color: #2e3650; color: #e8ecf3; }
.am-cn { color: #36e07a; font-size: 9.5px; }

/* ── Realtime ── */
.am-rt { display: grid; grid-template-columns: 1fr; gap: 10px; }
.am-rt-row {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  align-items: center;
  gap: 8px;
}
.am-rt-row--full { grid-template-columns: 1fr; margin-top: 4px; }
.am-rt-side {
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.am-rt-side--client { border-left: 2px solid #5b7cf6; }
.am-rt-side--server { border-left: 2px solid #ff8ec4; }
.am-rt-side--gold   { border-left: 2px solid #f5c842; }
.am-rt-ns {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #00f0ff;
}
.am-rt-name { font-size: 11.5px; font-weight: 700; color: #e8ecf3; }
.am-rt-desc { font-size: 10.5px; color: #a0a8bc; line-height: 1.4; }
.am-rt-desc code {
  font-size: 10.5px;
  background: rgba(255,255,255,.04);
  padding: 1px 4px;
  border-radius: 3px;
  color: #a0a8bc;
}
.am-rt-link {
  height: 1px;
  background: linear-gradient(90deg, #5b7cf6, #ff8ec4);
  position: relative;
}
.am-rt-link::before,
.am-rt-link::after {
  content: "";
  position: absolute;
  top: -3px;
  width: 7px; height: 7px;
  border-radius: 50%;
}
.am-rt-link::before { left: 0;  background: #5b7cf6; }
.am-rt-link::after  { right: 0; background: #ff8ec4; }
.am-pulse {
  position: absolute;
  top: -2px; left: 0;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #fff;
  animation: amRtMove 3s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255,255,255,.7);
}
@keyframes amRtMove {
  0%, 100% { left: 0; opacity: 0; }
  10%       { opacity: 1; }
  50%       { left: calc(100% - 5px); opacity: 1; }
  90%       { opacity: 0; }
}

/* ── Secret flow timeline ── */
.am-timeline {
  position: relative;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.am-timeline::before {
  content: "";
  position: absolute;
  left: 5px; top: 6px; bottom: 6px;
  width: 2px;
  background: linear-gradient(180deg, #f5c842, #ff8ec4);
  border-radius: 2px;
  opacity: 0.5;
}
.am-tl {
  position: relative;
  background: #161a24;
  border: 1px solid #232a3a;
  border-radius: 8px;
  padding: 8px 10px;
}
.am-tl::before {
  content: "";
  position: absolute;
  left: -16px; top: 12px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #f5c842;
  box-shadow: 0 0 0 3px rgba(245,200,66,.15);
}
.am-tl--b::before {
  background: #ff8ec4;
  box-shadow: 0 0 0 3px rgba(255,142,196,.15);
}
.am-tl-who {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #f5c842;
  letter-spacing: 0.04em;
}
.am-tl--b .am-tl-who { color: #ff8ec4; }
.am-tl-what {
  font-size: 11.5px;
  color: #e8ecf3;
  margin-top: 2px;
}
.am-tl-what code {
  font-size: 10.5px;
  background: rgba(255,255,255,.04);
  padding: 1px 4px;
  border-radius: 3px;
  color: #a0a8bc;
}
</style>
