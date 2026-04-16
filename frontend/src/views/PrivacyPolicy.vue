<!--
  Privacy Policy — AlpacaParty
-->
<template>
  <div class="legal-page">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: April 7, 2026</p>

    <section>
      <h2>1. Introduction</h2>
      <p>
        Welcome to <strong>AlpacaParty</strong> ("we", "us", "our"). We are committed to
        protecting your personal data and your right to privacy. This Privacy Policy explains
        what information we collect, how we use it, the legal basis for that use, and what
        rights you have in relation to it, in accordance with the
        <strong>General Data Protection Regulation (GDPR)</strong> (EU) 2016/679.
      </p>
    </section>

    <section>
      <h2>2. Data Controller</h2>
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

    <section>
      <h2>3. Information We Collect</h2>
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
        messages, posts, and organisation memberships so you can access them across sessions.
      </p>
      <h3>3.4 Technical Data</h3>
      <p>
        We automatically collect minimal technical data including IP address, browser type, and
        timestamps of requests. This data is used solely for security, rate-limiting, and
        debugging.
      </p>
    </section>

    <section>
      <h2>4. How We Use Your Information &amp; Legal Basis</h2>
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
            <td>Enable social features (friends, messaging, posts, organisations)</td>
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

    <section>
      <h2>5. Data Sharing</h2>
      <p>
        We do <strong>not</strong> sell, rent, or trade your personal data with third parties.
        Data is shared only in the following limited circumstances:
      </p>
      <ul>
        <li>With other users, to the extent you make information public (profile, posts, organisations).</li>
        <li>With third-party OAuth providers (Google, GitHub) when you choose to sign in via them.</li>
        <li>When required by law or to protect the rights, safety, or property of AlpacaParty and its users.</li>
      </ul>
    </section>

    <section>
      <h2>6. International Data Transfers</h2>
      <p>
        If you authenticate using Google or GitHub OAuth, your login request is processed by
        those providers' servers, which may be located outside the European Economic Area (EEA).
        Both Google and GitHub have committed to the EU Standard Contractual Clauses (SCCs)
        and/or maintain adequacy decisions under GDPR Chapter V, providing appropriate
        safeguards for your data during such transfers. We do not independently transfer your
        personal data outside the EEA.
      </p>
    </section>

    <section>
      <h2>7. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active. You may delete
        your account at any time from the <router-link to="/settings">Settings</router-link>
        page, after which your personal data will be permanently removed within 30 days.
        Server access logs (IP addresses, timestamps) used for security monitoring are
        retained for a maximum of 90 days.
      </p>
    </section>

    <section>
      <h2>8. Your Rights</h2>
      <p>
        Under GDPR Chapter III, you have the following rights. You can exercise them at any
        time by contacting us via the <router-link to="/help">Help</router-link> page.
      </p>
      <ul>
        <li>
          <strong>Access (Art. 15)</strong> — request a copy of the personal data we hold
          about you.
        </li>
        <li>
          <strong>Rectification (Art. 16)</strong> — correct inaccurate or incomplete data.
        </li>
        <li>
          <strong>Erasure (Art. 17)</strong> — request deletion of your data
          ("right to be forgotten").
        </li>
        <li>
          <strong>Data portability (Art. 20)</strong> — export your data in a
          machine-readable format. Available directly from the
          <router-link to="/settings">Settings</router-link> page.
        </li>
        <li>
          <strong>Object / Restrict (Arts. 18–21)</strong> — object to or restrict certain
          processing activities.
        </li>
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
        <a href="https://www.edpb.europa.eu" target="_blank" rel="noopener noreferrer">
          edpb.europa.eu</a>.
      </p>
    </section>

    <section>
      <h2>9. Cookies &amp; Local Storage</h2>
      <p>
        AlpacaParty uses a session token stored in <code>localStorage</code> to keep you
        signed in. We do not use third-party tracking cookies or advertising scripts.
      </p>
      <p>
        <strong>Security note:</strong> Tokens stored in <code>localStorage</code> are
        accessible to JavaScript running on the page and are therefore subject to
        Cross-Site Scripting (XSS) risk. We mitigate this through a strict
        Content Security Policy (CSP), input sanitisation, and output encoding. Despite
        these controls, you should log out on shared or untrusted devices.
      </p>
    </section>

    <section>
      <h2>10. Security</h2>
      <p>
        We implement industry-standard measures to protect your data, including HTTPS/TLS
        encryption, bcrypt password hashing, input validation, rate limiting, and a Web
        Application Firewall (WAF). Despite best efforts, no system is 100 % secure — please
        keep your credentials confidential.
      </p>
    </section>

    <section>
      <h2>11. Children's Privacy</h2>
      <p>
        GDPR Art. 8 sets the minimum age for consent to online services at <strong>16</strong>
        (member states may lower this to a minimum of 13). AlpacaParty requires users to be at
        least <strong>16 years old</strong>, in line with the GDPR default. We do not
        knowingly collect data from children below this age. If you believe we have, please
        contact us so we can promptly delete it.
      </p>
    </section>

    <section>
      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be
        communicated via an in-app notification. The "Last updated" date at the top of this
        page will always reflect the most recent revision. Continued use of the service after
        a change becomes effective constitutes acceptance of the revised policy.
      </p>
    </section>

    <section>
      <h2>13. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or our data-processing
        practices, please reach out via the
        <router-link to="/help">Help</router-link> page or submit a formal data request
        from <router-link to="/settings">Settings</router-link>.
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

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary, #a0a0b0);
}

th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 240, 255, 0.06);
  color: #ddd;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(42, 42, 58, 0.5);
  vertical-align: top;
}

section {
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 1rem;
}

section:last-child {
  border-bottom: none;
}
</style>
