import { threshold } from '../effects/threshold'
import { dither } from '../effects/dither'
import { COLOR_COUNTS, pixelate } from '../effects/pixelation'
import type { EffectSelection, ThresholdParams } from '../effects/types'
import type { DitherParams } from '../effects/dither'
import type { PixelationParams } from '../effects/pixelation'
import { validateDefinitions } from './validate'

export const effects = {
  threshold: {
    id: 'threshold' as const,
    name: 'Threshold',
    description: 'Separate light and shadow into two tones.',
    defaults: { cutoff: 128, invert: false } satisfies ThresholdParams,
    controls: { cutoff: { min: 0, max: 255, step: 1, label: 'Cutoff' }, invert: { label: 'Invert tones' } },
    process: threshold,
  },
  dither: {
    id: 'dither' as const,
    name: 'Floyd-Steinberg',
    description: 'Build light and shadow from a fine pattern of ink.',
    defaults: { contrast: 1, palette: 'ink' } satisfies DitherParams,
    controls: { contrast: { min: 0.5, max: 2, step: 0.05, label: 'Contrast' }, palette: { label: 'Palette', values: ['ink', 'terminal', 'vintage'] as const } },
    process: dither,
  },
  pixelation: {
    id: 'pixelation' as const,
    name: 'Pixelation',
    description: 'Reduce the image to blocks of a limited color set.',
    defaults: { blockSize: 12, colorCount: 64 } satisfies PixelationParams,
    controls: {
      blockSize: { min: 4, max: 64, step: 1, label: 'Block size' },
      colorCount: { label: 'Color count', values: COLOR_COUNTS },
    },
    process: pixelate,
  },
}

export type PresetDefinition = { id: string; name: string } & EffectSelection

export const vintageDitherPreset = {
  id: 'vintage-dither', name: 'Vintage Dither', effectId: 'dither', params: { contrast: 1.2, palette: 'vintage' },
} satisfies PresetDefinition

export const mosaicPreset = {
  id: 'mosaic', name: 'Mosaic', effectId: 'pixelation', params: { blockSize: 20, colorCount: 27 },
} satisfies PresetDefinition

export const presets: readonly PresetDefinition[] = [
  vintageDitherPreset,
  { id: 'ink', name: 'Ink', effectId: 'threshold', params: { cutoff: 140, invert: false } },
  mosaicPreset,
]

if (import.meta.env.DEV) validateDefinitions(effects, presets)

export function getPreset(id: string): PresetDefinition {
  const preset = presets.find((entry) => entry.id === id)
  if (!preset) throw new Error('Unknown preset.')
  return preset
}
