/**
 * PrivacyPolicy View Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import PrivacyPolicy from '../../../src/views/PrivacyPolicy.vue'

function mountPage() {
  return mount(PrivacyPolicy, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PrivacyPolicy.vue', () => {
  it('renders the page heading', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toBe('Privacy Policy')
  })

  it('has the legal-page container', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.legal-page').exists()).toBe(true)
  })

  it('shows last updated date', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.updated').text()).toContain('2026')
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

  it('has links to settings and help', () => {
    const wrapper = mountPage()
    const links = wrapper.findAllComponents(RouterLinkStub)
    const tos = links.map(l => l.props('to'))
    expect(tos).toContain('/settings')
    expect(tos).toContain('/help')
  })
})
