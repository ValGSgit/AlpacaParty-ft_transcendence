/**
 * Home View Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '../../../src/views/Home.vue'

describe('Home.vue', () => {
  it('renders welcome heading', () => {
    const wrapper = mount(Home)
    expect(wrapper.find('h1').text()).toContain('Welcome to AlpacaParty')
  })

  it('renders description text', () => {
    const wrapper = mount(Home)
    expect(wrapper.find('p').text()).toContain('up and running')
  })

  it('has proper class', () => {
    const wrapper = mount(Home)
    expect(wrapper.find('.home').exists()).toBe(true)
  })
})
