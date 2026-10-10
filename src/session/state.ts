import { effects, getPreset, vintageDitherPreset } from '../definitions/effects'
import type { EffectEdit, EffectId, ParametersByEffect } from '../effects/types'

export type Session = {
  sourceId: string
  effectId: EffectId
  parametersByEffect: ParametersByEffect
  presetId: string | null
  revision: number
}

export type SessionAction =
  | ({ type: 'edit' } & EffectEdit)
  | { type: 'preset'; id: string }
  | { type: 'effect'; id: EffectId }
  | { type: 'source'; id: string }
  | { type: 'reset-preset' }
  | { type: 'reset-effect' }

export function createSession(sourceId: string): Session {
  return { sourceId, effectId: vintageDitherPreset.effectId, parametersByEffect: {
    threshold: { ...effects.threshold.defaults }, dither: { ...vintageDitherPreset.params },
  }, presetId: vintageDitherPreset.id, revision: 1 }
}

export function isModified(session: Session): boolean {
  if (!session.presetId) return false
  const preset = getPreset(session.presetId)
  if (preset.effectId !== session.effectId) return true
  if (preset.effectId === 'dither') {
    const params = session.parametersByEffect.dither
    return params.contrast !== preset.params.contrast || params.palette !== preset.params.palette
  }
  const params = session.parametersByEffect.threshold
  return params.cutoff !== preset.params.cutoff || params.invert !== preset.params.invert
}

export function sessionReducer(state: Session, action: SessionAction): Session {
  const next = { ...state, revision: state.revision + 1 }
  switch (action.type) {
    case 'edit': {
      if (action.effectId !== state.effectId) return state
      const params = action.effectId === 'dither' && action.params.contrast !== undefined
        ? { ...action.params, contrast: Math.round(action.params.contrast * 20) / 20 } : action.params
      return { ...next, parametersByEffect: { ...state.parametersByEffect, [action.effectId]: { ...state.parametersByEffect[action.effectId], ...params } } }
    }
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
