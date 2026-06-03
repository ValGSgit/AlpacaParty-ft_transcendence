/**
 * TermsOfService View Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import TermsOfService from '../../../src/views/TermsOfService.vue'

function mountPage() {
  return mount(TermsOfService, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('TermsOfService.vue', () => {
  it('renders the page heading', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toMatch(/Terms of Service/i)
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

  it('has link to Privacy Policy', () => {
    const wrapper = mountPage()
    const hrefs = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props('to'))
    expect(hrefs).toContain('/privacy')
  })

  it('contains an acceptable-behavior / conduct clause', () => {
    const wrapper = mountPage()
    const text = wrapper.text().toLowerCase()
    expect(text).toMatch(/acceptable\s+(use|behavior|behaviour|conduct)/)
  })
})
