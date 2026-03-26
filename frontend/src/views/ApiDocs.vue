<!--
  API Documentation — Redirect page to interactive Swagger docs
  @owner ValGSgit
-->
<template>
  <div class="docs-landing">
    <div class="docs-card">
      <div class="docs-icon">{ }</div>
      <h1>API Documentation</h1>
      <p class="docs-subtitle">
        The AlpacaParty REST API documentation is available as an interactive
        Swagger UI where you can explore endpoints, view schemas, and test
        requests directly from your browser.
      </p>

      <div class="docs-features">
        <div class="feature">
          <span class="feature-icon">&#9889;</span>
          <span>Interactive request builder with live responses</span>
        </div>
        <div class="feature">
          <span class="feature-icon">&#128274;</span>
          <span>Built-in JWT and API key authorization</span>
        </div>
        <div class="feature">
          <span class="feature-icon">&#128218;</span>
          <span>Complete schema definitions and examples</span>
        </div>
      </div>

      <a href="/api/docs" class="docs-button">
        Open API Docs
        <span class="arrow">&rarr;</span>
      </a>

      <p class="docs-hint">
        Base URL: <code>/api</code> &mdash; All endpoints require
        <code>Authorization: Bearer &lt;token&gt;</code> unless noted otherwise.
      </p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.docs-landing {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.docs-card {
  max-width: 560px;
  width: 100%;
  text-align: center;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 16px;
  padding: 3rem 2.5rem;
}

.docs-icon {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
  margin-bottom: 1rem;
  font-family: monospace;
  opacity: 0.8;
}

h1 {
  font-size: 1.8rem;
  color: var(--primary, #00f0ff);
  margin: 0 0 0.75rem;
}

.docs-subtitle {
  color: #a0a0b0;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 2rem;
}

.docs-features {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
  text-align: left;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #c0c0d0;
  font-size: 0.9rem;
}

.feature-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
}

.docs-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #0a0a12;
  background: var(--primary, #00f0ff);
  border: none;
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.docs-button:hover {
  background: #33f5ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
}

.arrow {
  font-size: 1.2rem;
  transition: transform 0.2s;
}

.docs-button:hover .arrow {
  transform: translateX(3px);
}

.docs-hint {
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: #707080;
}

.docs-hint code {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}
</style>
