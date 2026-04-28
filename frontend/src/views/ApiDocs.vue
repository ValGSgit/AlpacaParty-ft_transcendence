<!--
  API Documentation — Public API guide + link to Swagger UI
  @owner ValGSgit
-->
<template>
  <div class="docs-page">

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
          <tr><td class="info-key">Rate limit</td><td>100 requests / minute per key</td></tr>
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
        <h3>Leaderboard</h3>
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <code class="path">/api/public/leaderboard</code>
          </div>
          <p>Game leaderboard ranked by ELO. Only includes public profiles.</p>
          <div class="param-table-wrap">
            <table class="param-table">
              <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>gameType</code></td><td>string</td><td>spit_royale</td><td>Game type to filter by</td></tr>
                <tr><td><code>limit</code></td><td>integer</td><td>20</td><td>Max entries (1–100)</td></tr>
                <tr><td><code>offset</code></td><td>integer</td><td>0</td><td>Results to skip</td></tr>
                <tr><td><code>anonymized</code></td><td>bool</td><td>false</td><td>Anonymize usernames/avatars</td></tr>
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
        <h3>Mock Dataset</h3>
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <code class="path">/api/public/mock</code>
          </div>
          <p>Returns a snapshot of real data with all usernames, avatars, and content fully anonymized. Safe to embed in demos or documentation. Includes users, leaderboard, and posts in one request.</p>
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

  </div>
</template>

<script setup>
</script>

<style scoped>
.docs-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 5rem;
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
.docs-section {
  margin-bottom: 3rem;
}

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
.endpoint-group {
  margin-bottom: 2rem;
}

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
</style>
