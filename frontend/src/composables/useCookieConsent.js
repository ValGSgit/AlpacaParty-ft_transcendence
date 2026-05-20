import { ref } from 'vue'

const CONSENT_KEY = 'cookie_consent'

// Module-level ref so all consumers share the same reactive state.
const consent = ref(localStorage.getItem(CONSENT_KEY))

export function useCookieConsent() {
  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    consent.value = 'accepted'
  }

  function deny() {
    localStorage.setItem(CONSENT_KEY, 'denied')
    consent.value = 'denied'
  }

  return { consent, accept, deny }
}
