<!--
  Privacy Policy — AlpacaParty
-->
<template>
  <div class="legal-page">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: March 9, 2026</p>

    <section>
      <h2>1. Introduction</h2>
      <p>
        Welcome to <strong>AlpacaParty</strong> ("we", "us", "our"). We are committed to
        protecting your personal data and your right to privacy. This Privacy Policy explains
        what information we collect, how we use it, and what rights you have in relation to it.
      </p>
    </section>

    <section>
      <h2>2. Information We Collect</h2>
      <h3>2.1 Account Information</h3>
      <p>
        When you register, we collect a username, email address, and a hashed password.
        If you sign in via a third-party OAuth provider (e.g. 42 Intra), we receive a
        limited profile (display name, avatar URL, and email) from that provider.
      </p>
      <h3>2.2 Profile Data</h3>
      <p>
        You may optionally provide a biography, status message, and upload a profile avatar.
        This data is stored on our servers and visible to other users according to your
        privacy settings.
      </p>
      <h3>2.3 Game &amp; Social Data</h3>
      <p>
        We store game progress (coins, farm state, achievements), friend lists, chat
        messages, posts, and organisation memberships so you can access them across sessions.
      </p>
      <h3>2.4 Technical Data</h3>
      <p>
        We automatically collect minimal technical data including IP address, browser type, and
        timestamps of requests. This data is used solely for security, rate-limiting, and
        debugging.
      </p>
    </section>

    <section>
      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve the AlpacaParty service.</li>
        <li>To authenticate you and keep your account secure.</li>
        <li>To enable social features (friends, messaging, posts, organisations).</li>
        <li>To persist your game progress and achievements.</li>
        <li>To send in-app notifications relevant to your activity.</li>
        <li>To comply with legal obligations.</li>
      </ul>
    </section>

    <section>
      <h2>4. Data Sharing</h2>
      <p>
        We do <strong>not</strong> sell, rent, or trade your personal data with third parties.
        Data is shared only in the following limited circumstances:
      </p>
      <ul>
        <li>With other users, to the extent you make information public (profile, posts, organisations).</li>
        <li>With third-party OAuth providers when you choose to link your account.</li>
        <li>When required by law or to protect the rights, safety, or property of AlpacaParty and its users.</li>
      </ul>
    </section>

    <section>
      <h2>5. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active. You may delete
        your account at any time from the Settings page, after which your data will be
        permanently removed within 30 days. Anonymised analytics data may be kept indefinitely.
      </p>
    </section>

    <section>
      <h2>6. Your Rights</h2>
      <p>Under applicable data-protection laws (including the GDPR), you have the right to:</p>
      <ul>
        <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
        <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
        <li><strong>Erasure</strong> — request deletion of your data ("right to be forgotten").</li>
        <li><strong>Data portability</strong> — export your data in a machine-readable format.</li>
        <li><strong>Object / Restrict</strong> — object to or restrict certain processing activities.</li>
      </ul>
      <p>
        You can exercise the right to data export directly from the
        <router-link to="/settings">Settings</router-link> page. For other requests, please
        contact us using the information below.
      </p>
    </section>

    <section>
      <h2>7. Cookies &amp; Local Storage</h2>
      <p>
        AlpacaParty uses a session token stored in <code>localStorage</code> to keep you
        signed in. We do not use third-party tracking cookies or advertising scripts.
      </p>
    </section>

    <section>
      <h2>8. Security</h2>
      <p>
        We implement industry-standard measures to protect your data, including HTTPS
        encryption, bcrypt password hashing, and input validation. Despite best efforts, no
        system is 100 % secure — please keep your credentials confidential.
      </p>
    </section>

    <section>
      <h2>9. Children's Privacy</h2>
      <p>
        AlpacaParty is not directed at children under 13. We do not knowingly collect data
        from children. If you believe we have, please contact us so we can promptly delete it.
      </p>
    </section>

    <section>
      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this
        page with an updated "Last updated" date. Continued use of the service after changes
        constitutes acceptance.
      </p>
    </section>

    <section>
      <h2>11. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy, please reach out to the
        AlpacaParty team via the <router-link to="/help">Help</router-link> page.
      </p>
    </section>
  </div>
</template>

<style scoped>
.legal-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  color: var(--text-primary, #e8e8f0);
  line-height: 1.75;
}

.legal-page h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.25rem;
}

.updated {
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.legal-page h2 {
  font-size: 1.25rem;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: #eee;
}

.legal-page h3 {
  font-size: 1.05rem;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  color: #ddd;
}

.legal-page p {
  margin-bottom: 0.75rem;
  color: var(--text-secondary, #a0a0b0);
}

.legal-page ul {
  margin: 0.5rem 0 1rem 1.5rem;
  color: var(--text-secondary, #a0a0b0);
}

.legal-page li {
  margin-bottom: 0.35rem;
}

.legal-page a {
  color: var(--primary, #00f0ff);
  text-decoration: underline;
}

.legal-page code {
  background: rgba(0, 240, 255, 0.08);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}

section {
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 1rem;
}

section:last-child {
  border-bottom: none;
}
</style>
