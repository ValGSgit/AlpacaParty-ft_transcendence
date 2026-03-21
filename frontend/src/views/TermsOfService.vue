<!--
  Terms of Service — AlpacaParty
-->
<template>
  <div class="legal-page">
    <h1>Terms of Service</h1>
    <p class="updated">Last updated: March 9, 2026</p>

    <section>
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using <strong>AlpacaParty</strong> ("the Service"), you agree to be
        bound by these Terms of Service ("Terms"). If you do not agree, please do not use the
        Service.
      </p>
    </section>

    <section>
      <h2>2. Description of Service</h2>
      <p>
        AlpacaParty is a social web application that lets users raise and customise a virtual
        alpaca farm, interact with other users through messaging, posts, and organisations,
        and earn achievements. The Service is provided as-is for educational and entertainment
        purposes as part of the 42 ft_transcendence project.
      </p>
    </section>

    <section>
      <h2>3. User Accounts</h2>
      <ul>
        <li>You must provide accurate information when creating an account.</li>
        <li>You are responsible for maintaining the confidentiality of your credentials.</li>
        <li>You must be at least 13 years old to create an account.</li>
        <li>One person may register only one account. Multiple accounts per person are not allowed.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
      </ul>
    </section>

    <section>
      <h2>4. Acceptable Use</h2>
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

    <section>
      <h2>5. User-Generated Content</h2>
      <p>
        You retain ownership of content you create (posts, messages, profile information).
        By posting content on AlpacaParty, you grant us a non-exclusive, royalty-free licence
        to store, display, and distribute that content within the Service. We may remove any
        content that violates these Terms.
      </p>
    </section>

    <section>
      <h2>6. Game Economy</h2>
      <p>
        In-game currency ("coins") and items (alpacas, farm upgrades) have no real-world
        monetary value. We reserve the right to adjust the game economy, reset progress, or
        modify game mechanics at any time.
      </p>
    </section>

    <section>
      <h2>7. Privacy</h2>
      <p>
        Your use of the Service is also governed by our
        <router-link to="/privacy">Privacy Policy</router-link>, which describes how we
        collect, use, and protect your personal data.
      </p>
    </section>

    <section>
      <h2>8. Account Suspension &amp; Termination</h2>
      <p>
        We may suspend or terminate your account at our discretion if you violate these Terms.
        You may delete your account at any time from the
        <router-link to="/settings">Settings</router-link> page. Upon deletion, your personal
        data will be removed in accordance with our Privacy Policy.
      </p>
    </section>

    <section>
      <h2>9. Disclaimers</h2>
      <ul>
        <li>The Service is provided <strong>"as is"</strong> without warranties of any kind,
            express or implied.</li>
        <li>We do not guarantee uninterrupted or error-free operation.</li>
        <li>We are not liable for any data loss, including loss of game progress.</li>
      </ul>
    </section>

    <section>
      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, AlpacaParty and its contributors shall not
        be liable for any indirect, incidental, special, or consequential damages arising from
        your use of the Service.
      </p>
    </section>

    <section>
      <h2>11. Modifications</h2>
      <p>
        We reserve the right to update these Terms at any time. Changes take effect when
        posted on this page. Continued use of the Service after changes constitutes acceptance
        of the revised Terms.
      </p>
    </section>

    <section>
      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which the Service is
        operated. Any disputes will be resolved in the competent courts of that jurisdiction.
      </p>
    </section>

    <section>
      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, please use the
        <router-link to="/help">Help</router-link> page to contact the AlpacaParty team.
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

section {
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 1rem;
}

section:last-child {
  border-bottom: none;
}
</style>
