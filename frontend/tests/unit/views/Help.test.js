/**
 * Help view compatibility test
 * The dedicated Help view was removed; keep a minimal test file so the suite stays stable.
 */
import { describe, it, expect } from 'vitest'

describe('Help view compatibility', () => {
  it('runs a placeholder assertion', () => {
    expect(true).toBe(true)
  })
})
