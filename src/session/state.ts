import { effects, getPreset } from '../definitions/effects'
import type { EffectId, ThresholdParams } from '../effects/types'

export type Session = {
  sourceId: string
  effectId: EffectId
  parametersByEffect: Record<EffectId, ThresholdParams>
  presetId: string | null
  revision: number
}

export type SessionAction =
  | { type: 'edit'; params: Partial<ThresholdParams> }
  | { type: 'preset'; id: string }
  | { type: 'effect'; id: EffectId }
  | { type: 'source'; id: string }
  | { type: 'reset-preset' }
  | { type: 'reset-effect' }

export function createSession(sourceId: string): Session {
  const preset = getPreset('ink')
  return { sourceId, effectId: 'threshold', parametersByEffect: { threshold: { ...preset.params } }, presetId: preset.id, revision: 1 }
}

export function isModified(session: Session): boolean {
  if (!session.presetId) return false
  const preset = getPreset(session.presetId)
  const params = session.parametersByEffect[session.effectId]
  return params.cutoff !== preset.params.cutoff || params.invert !== preset.params.invert
}

export function sessionReducer(state: Session, action: SessionAction): Session {
  const next = { ...state, revision: state.revision + 1 }
  switch (action.type) {
    case 'edit':
      return { ...next, parametersByEffect: { ...state.parametersByEffect, [state.effectId]: { ...state.parametersByEffect[state.effectId], ...action.params } } }
    case 'preset': {
      const preset = getPreset(action.id)
      return { ...next, effectId: preset.effectId, presetId: preset.id, parametersByEffect: { ...state.parametersByEffect, [preset.effectId]: { ...preset.params } } }
    }
    case 'effect': return { ...next, effectId: action.id, presetId: null }
    case 'source': return { ...next, sourceId: action.id }
    case 'reset-preset': return state.presetId ? sessionReducer(state, { type: 'preset', id: state.presetId }) : state
    case 'reset-effect':
      return { ...next, presetId: null, parametersByEffect: { ...state.parametersByEffect, [state.effectId]: { ...effects[state.effectId].defaults } } }
  }
}
