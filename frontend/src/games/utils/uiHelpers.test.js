import { describe, it, expect } from 'vitest'
// globals.js and constants.js form an import cycle (constants reads globals,
// globals reads CONST.HP at eval). Evaluating globals first resolves it — the
// same order the app's bundle uses. Keep this import above the others.
import '../core/globals.js'
import { CONST } from '../config/constants.js'
import { getHearts } from './uiHelpers.js'

const fullHearts = (s) => s.split('❤️').length - 1
const brokenHearts = (s) => s.split('💔').length - 1

describe('getHearts', () => {
  it('renders all full hearts at max HP', () => {
    const s = getHearts(CONST.HP)
    expect(fullHearts(s)).toBe(CONST.HP)
    expect(brokenHearts(s)).toBe(0)
  })

  it('renders all broken hearts at 0 HP', () => {
    const s = getHearts(0)
    expect(fullHearts(s)).toBe(0)
    expect(brokenHearts(s)).toBe(CONST.HP)
  })

  it('mixes hearts proportionally to current HP', () => {
    const hp = 1
    const s = getHearts(hp)
    expect(fullHearts(s)).toBe(hp)
    expect(brokenHearts(s)).toBe(CONST.HP - hp)
  })

  it('clamps negative HP to all broken', () => {
    expect(fullHearts(getHearts(-5))).toBe(0)
    expect(brokenHearts(getHearts(-5))).toBe(CONST.HP)
  })

  it('clamps HP above the maximum to all full', () => {
    const s = getHearts(CONST.HP + 10)
    expect(fullHearts(s)).toBe(CONST.HP)
    expect(brokenHearts(s)).toBe(0)
  })
})
