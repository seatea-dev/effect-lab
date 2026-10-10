import { expect, test } from 'vitest'
import { createSession, isModified, sessionReducer } from '../src/session/state'

test('customizing Ink keeps its name and source, and Reset Preset restores its settings', () => {
  const original = createSession('urban')
  const edited = sessionReducer(original, { type: 'edit', params: { cutoff: 180 } })
  expect(edited.sourceId).toBe('urban')
  expect(edited.presetId).toBe('ink')
  expect(isModified(edited)).toBe(true)
  const reset = sessionReducer(edited, { type: 'reset-preset' })
  expect(reset.parametersByEffect.threshold).toEqual({ cutoff: 140, invert: false })
  expect(isModified(reset)).toBe(false)
  expect(reset.sourceId).toBe('urban')
  expect(reset.revision).toBeGreaterThan(edited.revision)
})

test('Reset Effect restores built-in values and clears preset association without changing the source', () => {
  const edited = sessionReducer(createSession('urban'), { type: 'edit', params: { cutoff: 200, invert: true } })
  const reset = sessionReducer(edited, { type: 'reset-effect' })
  expect(reset.parametersByEffect.threshold).toEqual({ cutoff: 128, invert: false })
  expect(reset.presetId).toBeNull()
  expect(reset.sourceId).toBe('urban')
})

test('source changes preserve modified settings and effect selection remembers them', () => {
  const edited = sessionReducer(createSession('urban'), { type: 'edit', params: { cutoff: 80, invert: true } })
  const switched = sessionReducer(edited, { type: 'source', id: 'fixture' })
  expect(switched.parametersByEffect.threshold).toEqual({ cutoff: 80, invert: true })
  expect(switched.presetId).toBe('ink')
  const effect = sessionReducer(switched, { type: 'effect', id: 'threshold' })
  expect(effect.parametersByEffect.threshold).toEqual({ cutoff: 80, invert: true })
  expect(effect.presetId).toBeNull()
  expect(effect.sourceId).toBe('fixture')
})

test('returning edited values to the preset clears Modified and reloading starts fresh', () => {
  const edited = sessionReducer(createSession('urban'), { type: 'edit', params: { cutoff: 180 } })
  expect(isModified(sessionReducer(edited, { type: 'edit', params: { cutoff: 140 } }))).toBe(false)
  expect(createSession('urban').parametersByEffect.threshold).toEqual({ cutoff: 140, invert: false })
})
