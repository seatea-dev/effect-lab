import { expect, test } from 'vitest'
import { validateDefinitions } from '../src/definitions/validate'
import { effects as catalogEffects, presets as catalogPresets } from '../src/definitions/effects'

const threshold = {
  id: 'threshold',
  defaults: { cutoff: 128, invert: false },
  controls: {
    cutoff: { min: 0, max: 255, step: 1, label: 'Cutoff' },
    invert: { label: 'Invert' },
  },
  process: () => {},
}

const effects = { threshold }
const ink = { id: 'ink', name: 'Ink', effectId: 'threshold', params: { cutoff: 140, invert: false } }
const secondPreset = { id: 'soft-ink', name: 'Soft Ink', effectId: 'threshold', params: { cutoff: 112, invert: true } }
const dither = {
  id: 'dither',
  defaults: { contrast: 1, palette: 'ink' },
  controls: {
    contrast: { min: 0.5, max: 2, step: 0.05, label: 'Contrast' },
    palette: { label: 'Palette', values: ['ink', 'vintage'] },
  },
  process: () => {},
}

test('validates the shipped definitions', () => {
  expect(() => validateDefinitions(catalogEffects, catalogPresets)).not.toThrow()
})

test('allows multiple presets for one effect', () => {
  expect(() => validateDefinitions(effects, [ink, secondPreset])).not.toThrow()
})

test('accepts a numeric step and enum values in a preset', () => {
  const preset = { id: 'vintage', name: 'Vintage', effectId: 'dither', params: { contrast: 1.2, palette: 'vintage' } }
  expect(() => validateDefinitions({ dither }, [preset])).not.toThrow()
})

test.each([
  ['default outside range', { ...threshold, defaults: { cutoff: 256, invert: false } }, [ink]],
  ['default off step', { ...threshold, controls: { ...threshold.controls, cutoff: { min: 0, max: 10, step: 3, label: 'Cutoff' } }, defaults: { cutoff: 4, invert: false } }, [ink]],
  ['invalid range step', { ...threshold, controls: { ...threshold.controls, cutoff: { min: 0, max: 10, step: 0, label: 'Cutoff' } } }, [ink]],
  ['unaligned range endpoint', { ...threshold, controls: { ...threshold.controls, cutoff: { min: 0, max: 10, step: 3, label: 'Cutoff' } } }, [ink]],
  ['preset outside range', threshold, [{ ...ink, params: { cutoff: -1, invert: false } }]],
  ['duplicate preset IDs', threshold, [ink, { ...secondPreset, id: 'ink' }]],
  ['unknown preset effect', threshold, [{ ...ink, effectId: 'missing' }]],
  ['preset has incomplete parameters', threshold, [{ ...ink, params: { cutoff: 140 } }]],
] as const)('rejects %s', (_name, effect, presets) => {
  expect(() => validateDefinitions({ threshold: effect }, presets)).toThrow()
})

test('rejects duplicate effect IDs in the registry', () => {
  expect(() => validateDefinitions({ threshold, alias: threshold }, [ink])).toThrow(/duplicated/)
})

test('rejects preset values outside an enum', () => {
  const preset = { id: 'vintage', name: 'Vintage', effectId: 'dither', params: { contrast: 1, palette: 'blueprint' } }
  expect(() => validateDefinitions({ dither }, [preset])).toThrow(/allowed value/)
})

test('rejects effect defaults outside an enum', () => {
  const invalidDither = { ...dither, defaults: { contrast: 1, palette: 'blueprint' } }
  expect(() => validateDefinitions({ dither: invalidDither }, [])).toThrow(/allowed value/)
})
