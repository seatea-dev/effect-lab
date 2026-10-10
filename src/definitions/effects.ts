import { threshold } from '../effects/threshold'
import type { EffectId, ThresholdParams } from '../effects/types'

export const effects = {
  threshold: {
    id: 'threshold' as const,
    name: 'Threshold',
    description: 'Separate light and shadow into two tones.',
    defaults: { cutoff: 128, invert: false } satisfies ThresholdParams,
    controls: { cutoff: { min: 0, max: 255, step: 1, label: 'Cutoff' }, invert: { label: 'Invert tones' } },
    process: threshold,
  },
}

export type PresetDefinition = {
  id: string
  name: string
  effectId: EffectId
  params: ThresholdParams
}

export const presets: readonly PresetDefinition[] = [
  { id: 'ink', name: 'Ink', effectId: 'threshold', params: { cutoff: 140, invert: false } },
]

export function getPreset(id: string): PresetDefinition {
  const preset = presets.find((entry) => entry.id === id)
  if (!preset) throw new Error('Unknown preset.')
  return preset
}
