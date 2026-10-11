import { expect, test } from 'vitest'
import { createSession, isModified, sessionReducer } from '../src/session/state'

const acceptSource = (state: ReturnType<typeof createSession>, id: string) => {
  const pending = sessionReducer(state, { type: 'source', id })
  return sessionReducer(pending, { type: 'source-ready', id, intent: pending.sourceIntent })
}

const inkSession = () => sessionReducer(createSession('urban'), { type: 'preset', id: 'ink' })

test('customizing Ink keeps its name and source, and Reset Preset restores its settings', () => {
  const original = inkSession()
  const edited = sessionReducer(original, { type: 'edit', effectId: 'threshold', params: { cutoff: 180 } })
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
  const edited = sessionReducer(inkSession(), { type: 'edit', effectId: 'threshold', params: { cutoff: 200, invert: true } })
  const reset = sessionReducer(edited, { type: 'reset-effect' })
  expect(reset.parametersByEffect.threshold).toEqual({ cutoff: 128, invert: false })
  expect(reset.presetId).toBeNull()
  expect(reset.sourceId).toBe('urban')
})

test('source changes preserve modified settings and effect selection remembers them', () => {
  const edited = sessionReducer(inkSession(), { type: 'edit', effectId: 'threshold', params: { cutoff: 80, invert: true } })
  const switched = acceptSource(edited, 'fixture')
  expect(switched.parametersByEffect.threshold).toEqual({ cutoff: 80, invert: true })
  expect(switched.presetId).toBe('ink')
  const effect = sessionReducer(switched, { type: 'effect', id: 'threshold' })
  expect(effect.parametersByEffect.threshold).toEqual({ cutoff: 80, invert: true })
  expect(effect.presetId).toBeNull()
  expect(effect.sourceId).toBe('fixture')
})

test('returning edited values to the preset clears Modified and reloading starts fresh', () => {
  const edited = sessionReducer(inkSession(), { type: 'edit', effectId: 'threshold', params: { cutoff: 180 } })
  expect(isModified(sessionReducer(edited, { type: 'edit', effectId: 'threshold', params: { cutoff: 140 } }))).toBe(false)
  expect(createSession('urban').parametersByEffect.dither).toEqual({ contrast: 1.2, palette: 'vintage' })
})

test('a fresh session starts with Vintage Dither and other effects use built-in defaults', () => {
  const session = createSession('urban')
  expect(session.sourceId).toBe('urban')
  expect(session.effectId).toBe('dither')
  expect(session.presetId).toBe('vintage-dither')
  expect(session.parametersByEffect.dither).toEqual({ contrast: 1.2, palette: 'vintage' })
  expect(session.parametersByEffect.threshold).toEqual({ cutoff: 128, invert: false })
  expect(session.parametersByEffect.pixelation).toEqual({ blockSize: 12, colorCount: 64 })
})

test('Mosaic applies Pixelation settings without changing the source and reports preset equality', () => {
  const session = sessionReducer(createSession('portrait'), { type: 'preset', id: 'mosaic' })
  expect(session).toMatchObject({
    sourceId: 'portrait',
    effectId: 'pixelation',
    presetId: 'mosaic',
    parametersByEffect: { pixelation: { blockSize: 20, colorCount: 27 } },
  })
  expect(isModified(session)).toBe(false)
})

test('Pixelation remembers edits across effect and source changes and keeps resets separate', () => {
  let session = sessionReducer(createSession('urban'), { type: 'preset', id: 'mosaic' })
  session = sessionReducer(session, { type: 'edit', effectId: 'pixelation', params: { blockSize: 31, colorCount: 125 } })
  expect(isModified(session)).toBe(true)
  session = acceptSource(session, 'nature')
  expect(session.parametersByEffect.pixelation).toEqual({ blockSize: 31, colorCount: 125 })
  expect(session.presetId).toBe('mosaic')
  session = sessionReducer(session, { type: 'effect', id: 'threshold' })
  session = sessionReducer(session, { type: 'effect', id: 'pixelation' })
  expect(session.parametersByEffect.pixelation).toEqual({ blockSize: 31, colorCount: 125 })
  expect(session.presetId).toBeNull()
  const effectReset = sessionReducer(session, { type: 'reset-effect' })
  expect(effectReset.parametersByEffect.pixelation).toEqual({ blockSize: 12, colorCount: 64 })
  expect(effectReset.presetId).toBeNull()
  expect(effectReset.sourceId).toBe('nature')

  const editedPreset = sessionReducer(effectReset, { type: 'preset', id: 'mosaic' })
  const resetPreset = sessionReducer(sessionReducer(editedPreset, { type: 'edit', effectId: 'pixelation', params: { blockSize: 42 } }), { type: 'reset-preset' })
  expect(resetPreset.parametersByEffect.pixelation).toEqual({ blockSize: 20, colorCount: 27 })
  expect(isModified(resetPreset)).toBe(false)
  expect(resetPreset.sourceId).toBe('nature')
})

test('dither edits normalize contrast and retain Modified until preset values return', () => {
  const original = createSession('urban')
  const edited = sessionReducer(original, { type: 'edit', effectId: 'dither', params: { contrast: 1.2000000000000002 } })
  expect(edited.parametersByEffect.dither.contrast).toBe(1.2)
  expect(isModified(edited)).toBe(false)
  const changed = sessionReducer(edited, { type: 'edit', effectId: 'dither', params: { contrast: 1.55, palette: 'terminal' } })
  expect(changed.presetId).toBe('vintage-dither')
  expect(isModified(changed)).toBe(true)
  expect(sessionReducer(changed, { type: 'reset-preset' }).parametersByEffect.dither).toEqual({ contrast: 1.2, palette: 'vintage' })
})

test('switching effects remembers each set of values and each reset keeps the source', () => {
  let session = sessionReducer(createSession('urban'), { type: 'edit', effectId: 'dither', params: { contrast: 1.7, palette: 'terminal' } })
  session = sessionReducer(session, { type: 'effect', id: 'threshold' })
  expect(session.presetId).toBeNull()
  session = sessionReducer(session, { type: 'edit', effectId: 'threshold', params: { cutoff: 70, invert: true } })
  session = acceptSource(session, 'fixture')
  session = sessionReducer(session, { type: 'effect', id: 'dither' })
  expect(session.parametersByEffect.dither).toEqual({ contrast: 1.7, palette: 'terminal' })
  expect(session.parametersByEffect.threshold).toEqual({ cutoff: 70, invert: true })
  const reset = sessionReducer(session, { type: 'reset-effect' })
  expect(reset.parametersByEffect.dither).toEqual({ contrast: 1, palette: 'ink' })
  expect(reset.presetId).toBeNull()
  expect(reset.sourceId).toBe('fixture')
  const preset = sessionReducer(reset, { type: 'preset', id: 'vintage-dither' })
  expect(preset.parametersByEffect.dither).toEqual({ contrast: 1.2, palette: 'vintage' })
  expect(preset.parametersByEffect.threshold).toEqual({ cutoff: 70, invert: true })
  expect(preset.sourceId).toBe('fixture')
  expect(sessionReducer(preset, { type: 'effect', id: 'dither' }).presetId).toBeNull()
  expect(sessionReducer(preset, { type: 'edit', effectId: 'threshold', params: { cutoff: 255 } })).toBe(preset)
})

test('a pending source keeps the usable source and latest settings until accepted', () => {
  let state = createSession('urban')
  state = sessionReducer(state, { type: 'source', id: 'portrait' })
  expect(state.sourceId).toBe('urban')
  expect(state.pendingSourceId).toBe('portrait')
  const intent = state.sourceIntent
  state = sessionReducer(state, { type: 'edit', effectId: 'dither', params: { contrast: 1.65 } })
  state = sessionReducer(state, { type: 'source-ready', id: 'portrait', intent })
  expect(state.sourceId).toBe('portrait')
  expect(state.pendingSourceId).toBeNull()
  expect(state.parametersByEffect.dither.contrast).toBe(1.65)
  expect(state.presetId).toBe('vintage-dither')
})

test('failed replacement keeps the retained upload and restores the source with latest settings', () => {
  let state = sessionReducer(createSession('urban'), { type: 'source', id: 'upload-a' })
  state = sessionReducer(state, { type: 'source-ready', id: 'upload-a', intent: state.sourceIntent, upload: true })
  state = sessionReducer(state, { type: 'source', id: 'upload-b' })
  const intent = state.sourceIntent
  state = sessionReducer(state, { type: 'edit', effectId: 'dither', params: { contrast: 1.8 } })
  const revision = state.revision
  state = sessionReducer(state, { type: 'source-failed', id: 'upload-b', intent, message: 'Could not decode' })
  expect(state.sourceId).toBe('upload-a')
  expect(state.retainedUploadId).toBe('upload-a')
  expect(state.pendingSourceId).toBeNull()
  expect(state.parametersByEffect.dither.contrast).toBe(1.8)
  expect(state.revision).toBeGreaterThan(revision)
  expect(state.sourceError).toBe('Could not decode')
})

test('obsolete successes and failures cannot replace a newer sample or retained upload', () => {
  let state = sessionReducer(createSession('urban'), { type: 'source', id: 'upload-a' })
  const obsolete = state.sourceIntent
  state = sessionReducer(state, { type: 'source', id: 'nature' })
  expect(sessionReducer(state, { type: 'source-ready', id: 'upload-a', intent: obsolete, upload: true })).toBe(state)
  expect(sessionReducer(state, { type: 'source-failed', id: 'upload-a', intent: obsolete, message: 'Late error' })).toBe(state)
  state = sessionReducer(state, { type: 'source', id: 'upload-a' })
  expect(sessionReducer(state, { type: 'source-ready', id: 'upload-a', intent: obsolete, upload: true })).toBe(state)
  state = sessionReducer(state, { type: 'source-ready', id: 'upload-a', intent: state.sourceIntent, upload: true })
  state = sessionReducer(state, { type: 'source', id: 'upload-b' })
  state = sessionReducer(state, { type: 'source-ready', id: 'upload-b', intent: state.sourceIntent, upload: true })
  expect(state.retainedUploadId).toBe('upload-b')
  state = acceptSource(state, 'nature')
  expect(state.retainedUploadId).toBe('upload-b')
})
