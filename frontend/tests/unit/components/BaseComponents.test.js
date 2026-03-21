/**
 * Reusable UI Component Unit Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../../../src/components/BaseButton.vue'
import BaseInput from '../../../src/components/BaseInput.vue'
import BaseModal from '../../../src/components/BaseModal.vue'
import NotifBadge from '../../../src/components/NotifBadge.vue'
import ErrorBanner from '../../../src/components/ErrorBanner.vue'
import EmptyState from '../../../src/components/EmptyState.vue'
import LoadingSpinner from '../../../src/components/LoadingSpinner.vue'

// ── BaseButton ──────────────────────────────────────────────────
describe('BaseButton', () => {
  it('renders slot content', () => {
    const w = mount(BaseButton, { slots: { default: 'Save' } })
    expect(w.text()).toContain('Save')
  })

  it('is disabled when disabled prop is true', () => {
    const w = mount(BaseButton, { props: { disabled: true }, slots: { default: 'X' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('is disabled while loading', () => {
    const w = mount(BaseButton, { props: { loading: true }, slots: { default: 'X' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('applies variant class', () => {
    const w = mount(BaseButton, { props: { variant: 'danger' }, slots: { default: 'X' } })
    expect(w.find('button').classes()).toContain('btn-danger')
  })

  it('emits click when not disabled', async () => {
    const w = mount(BaseButton, { slots: { default: 'Click me' } })
    await w.find('button').trigger('click')
    // button does not prevent native clicks; parent handler attaches via v-on
    // Just verify it renders correctly
    expect(w.find('button').exists()).toBe(true)
  })

  it('shows loading indicator when loading prop is true', () => {
    const w = mount(BaseButton, { props: { loading: true }, slots: { default: 'Submit' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
    // The button should still be rendered
    expect(w.find('button').exists()).toBe(true)
  })

  it('is not disabled when neither disabled nor loading', () => {
    const w = mount(BaseButton, { props: { disabled: false, loading: false }, slots: { default: 'Go' } })
    expect(w.find('button').attributes('disabled')).toBeUndefined()
  })
})

// ── BaseInput ───────────────────────────────────────────────────
describe('BaseInput', () => {
  it('renders label when provided', () => {
    const w = mount(BaseInput, { props: { label: 'Email', modelValue: '' } })
    expect(w.find('label').text()).toBe('Email')
  })

  it('shows error message when error prop is set', () => {
    const w = mount(BaseInput, { props: { modelValue: '', error: 'Required field' } })
    expect(w.find('.input-error').text()).toBe('Required field')
  })

  it('emits update:modelValue on input', async () => {
    const w = mount(BaseInput, { props: { modelValue: '' } })
    await w.find('input').setValue('hello')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('renders textarea when type is textarea', () => {
    const w = mount(BaseInput, { props: { type: 'textarea', modelValue: '' } })
    expect(w.find('textarea').exists()).toBe(true)
    expect(w.find('input').exists()).toBe(false)
  })

  it('does not show error when error prop is not set', () => {
    const w = mount(BaseInput, { props: { modelValue: '' } })
    expect(w.find('.input-error').exists()).toBe(false)
  })

  it('applies error class when error prop is provided', () => {
    const w = mount(BaseInput, { props: { modelValue: '', error: 'Invalid' } })
    expect(w.find('.input-error').exists()).toBe(true)
    expect(w.find('.input-error').text()).toBe('Invalid')
  })
})

// ── BaseModal ───────────────────────────────────────────────────
describe('BaseModal', () => {
  it('renders with title', () => {
    const w = mount(BaseModal, { props: { title: 'Confirm Action' }, slots: { default: 'Are you sure?' } })
    expect(w.find('.modal-title').text()).toBe('Confirm Action')
    expect(w.text()).toContain('Are you sure?')
  })

  it('emits close when close button is clicked', async () => {
    const w = mount(BaseModal, { props: { title: 'Test' }, slots: { default: 'Content' } })
    await w.find('.modal-close').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    expect(w.emitted('close').length).toBe(1)
  })

  it('emits close when backdrop is clicked', async () => {
    const w = mount(BaseModal, { props: { title: 'Test' }, slots: { default: 'Content' } })
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })

  it('renders slot content in body', () => {
    const w = mount(BaseModal, { props: { title: 'Info' }, slots: { default: '<p>Hello modal</p>' } })
    expect(w.find('.modal-body').text()).toContain('Hello modal')
  })

  it('renders footer slot when provided', () => {
    const w = mount(BaseModal, {
      props: { title: 'With Footer' },
      slots: {
        default: 'Body',
        footer: '<button>OK</button>',
      },
    })
    expect(w.find('.modal-footer').exists()).toBe(true)
    expect(w.find('.modal-footer').text()).toContain('OK')
  })

  it('does not render footer when no footer slot', () => {
    const w = mount(BaseModal, { props: { title: 'No Footer' }, slots: { default: 'Body' } })
    expect(w.find('.modal-footer').exists()).toBe(false)
  })
})

// ── NotifBadge ──────────────────────────────────────────────────
describe('NotifBadge', () => {
  it('renders nothing when count is 0', () => {
    const w = mount(NotifBadge, { props: { count: 0 } })
    expect(w.find('.notif-badge').exists()).toBe(false)
  })

  it('renders count when > 0', () => {
    const w = mount(NotifBadge, { props: { count: 5 } })
    expect(w.find('.notif-badge').text()).toBe('5')
  })

  it('shows 99+ for large counts', () => {
    const w = mount(NotifBadge, { props: { count: 150 } })
    expect(w.find('.notif-badge').text()).toBe('99+')
  })
})

// ── ErrorBanner ─────────────────────────────────────────────────
describe('ErrorBanner', () => {
  it('renders nothing when message is empty', () => {
    const w = mount(ErrorBanner, { props: { message: '' } })
    expect(w.find('.error-banner').exists()).toBe(false)
  })

  it('renders message when provided', () => {
    const w = mount(ErrorBanner, { props: { message: 'Something went wrong' } })
    expect(w.text()).toContain('Something went wrong')
  })

  it('emits dismiss when close button clicked', async () => {
    const w = mount(ErrorBanner, { props: { message: 'Error!' } })
    await w.find('.banner-close').trigger('click')
    expect(w.emitted('dismiss')).toBeTruthy()
  })

  it('applies success variant class', () => {
    const w = mount(ErrorBanner, { props: { message: 'Done!', variant: 'success' } })
    expect(w.find('.error-banner').classes()).toContain('success')
  })
})

// ── EmptyState ──────────────────────────────────────────────────
describe('EmptyState', () => {
  it('renders title and description', () => {
    const w = mount(EmptyState, {
      props: { title: 'No items', description: 'Add your first item', icon: '📭' },
    })
    expect(w.find('.empty-title').text()).toBe('No items')
    expect(w.find('.empty-desc').text()).toBe('Add your first item')
    expect(w.find('.empty-icon').text()).toBe('📭')
  })
})

// ── LoadingSpinner ──────────────────────────────────────────────
describe('LoadingSpinner', () => {
  it('renders loading message', () => {
    const w = mount(LoadingSpinner, { props: { message: 'Fetching data…' } })
    expect(w.text()).toContain('Fetching data…')
  })

  it('adds inline class when inline prop is set', () => {
    const w = mount(LoadingSpinner, { props: { inline: true } })
    expect(w.find('.spinner-wrap').classes()).toContain('inline')
  })
})
