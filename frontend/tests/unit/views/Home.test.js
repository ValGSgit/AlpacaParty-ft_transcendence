/**
 * Home route unit tests
 */
import { describe, it, expect } from 'vitest'
import router from '../../../src/router/index.js'

describe('Home route', () => {
  it('defines a Home route', () => {
    const home = router.getRoutes().find(r => r.name === 'Home')
    expect(home).toBeDefined()
    expect(home.path).toBe('/')
  })
})
