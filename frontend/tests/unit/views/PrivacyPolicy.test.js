/**
 * PrivacyPolicy View Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import PrivacyPolicy from '../../../src/views/PrivacyPolicy.vue'

function mountPage() {
  return mount(PrivacyPolicy, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PrivacyPolicy.vue', () => {
  it('renders the page heading', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toMatch(/Privacy/i)
  })

  it('has the doc-page container', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.doc-page').exists()).toBe(true)
  })

  it('shows the effective date', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('2026')
  })

  it('contains multiple sections', () => {
    const wrapper = mountPage()
    const sections = wrapper.findAll('section')
    expect(sections.length).toBeGreaterThanOrEqual(5)
  })

  it('mentions AlpacaParty', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('AlpacaParty')
  })

  it('mentions GDPR rights', () => {
    const wrapper = mountPage()
    expect(wrapper.text().toLowerCase()).toContain('gdpr')
  })

  it('links to the settings page and the help desk', () => {
    const wrapper = mountPage()
    const tos = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props('to'))
    // Settings are reached through /profile?tab=settings, so look for a link
    // that targets the profile route with a settings tab anywhere in it.
    expect(
      tos.some(
        (to) => typeof to === 'string' && to.includes('/profile') && to.includes('settings'),
      ),
    ).toBe(true)
    expect(tos).toContain('/help')
  })
})
