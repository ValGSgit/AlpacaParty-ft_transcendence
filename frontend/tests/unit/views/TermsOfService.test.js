/**
 * TermsOfService View Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import TermsOfService from '../../../src/views/TermsOfService.vue'

function mountPage() {
  return mount(TermsOfService, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('TermsOfService.vue', () => {
  it('renders the page heading', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toBe('Terms of Service')
  })

  it('has the doc-page container', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.doc-page').exists()).toBe(true)
  })

  it('shows last updated date', () => {
    const wrapper = mountPage()
    expect(wrapper.find('.doc-meta').text()).toContain('2026')
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
    const links = wrapper.findAllComponents(RouterLinkStub)
    const hrefs = links.map(l => l.props('to'))
    expect(hrefs).toContain('/privacy')
  })

  it('contains acceptable use section', () => {
    const wrapper = mountPage()
    expect(wrapper.text().toLowerCase()).toContain('acceptable use')
  })
})
