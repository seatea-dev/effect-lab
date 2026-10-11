import { effects, getPreset, vintageDitherPreset } from '../definitions/effects'
import type { EffectEdit, EffectId, ParametersByEffect } from '../effects/types'

export type Session = {
  sourceId: string
  pendingSourceId: string | null
  sourceIntent: number
  retainedUploadId: string | null
  sourceError?: string
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
  | { type: 'source-ready'; id: string; intent: number; upload?: boolean }
  | { type: 'source-failed'; id: string; intent: number; message: string }
  | { type: 'reset-preset' }
  | { type: 'reset-effect' }

export function createSession(sourceId: string): Session {
  return { sourceId, pendingSourceId: null, sourceIntent: 0, retainedUploadId: null, effectId: vintageDitherPreset.effectId, parametersByEffect: {
    threshold: { ...effects.threshold.defaults }, dither: { ...vintageDitherPreset.params }, pixelation: { ...effects.pixelation.defaults },
    edge: { ...effects.edge.defaults },
    halftone: { ...effects.halftone.defaults },
  }, presetId: vintageDitherPreset.id, revision: 1 }
}

export function isModified(session: Session): boolean {
  if (!session.presetId) return false
  const preset = getPreset(session.presetId)
  if (preset.effectId !== session.effectId) return true
  const parameters = session.parametersByEffect[session.effectId] as Record<string, unknown>
  const defaults = preset.params as Record<string, unknown>
  return Object.keys(defaults).some((name) => parameters[name] !== defaults[name])
}

export function sessionReducer(state: Session, action: SessionAction): Session {
  const next = { ...state, revision: state.revision + 1 }
  switch (action.type) {
    case 'edit': {
      if (action.effectId !== state.effectId) return state
      const params = (action.effectId === 'dither' || action.effectId === 'halftone') && action.params.contrast !== undefined
        ? { ...action.params, contrast: Math.round(action.params.contrast * 20) / 20 } : action.params
      return { ...next, parametersByEffect: { ...state.parametersByEffect, [action.effectId]: { ...state.parametersByEffect[action.effectId], ...params } } }
    }
    case 'preset': {
      const preset = getPreset(action.id)
      return { ...next, effectId: preset.effectId, presetId: preset.id, parametersByEffect: { ...state.parametersByEffect, [preset.effectId]: { ...preset.params } } }
    }
    case 'effect': return { ...next, effectId: action.id, presetId: null }
    case 'source': return { ...next, pendingSourceId: action.id, sourceIntent: state.sourceIntent + 1, sourceError: undefined }
    case 'source-ready':
      if (action.id !== state.pendingSourceId || action.intent !== state.sourceIntent) return state
      return { ...state, sourceId: action.id, pendingSourceId: null, retainedUploadId: action.upload ? action.id : state.retainedUploadId }
    case 'source-failed':
      if (action.id !== state.pendingSourceId || action.intent !== state.sourceIntent) return state
      return { ...next, pendingSourceId: null, sourceError: action.message }
    case 'reset-preset': return state.presetId ? sessionReducer(state, { type: 'preset', id: state.presetId }) : state
    case 'reset-effect':
      return { ...next, presetId: null, parametersByEffect: { ...state.parametersByEffect, [state.effectId]: { ...effects[state.effectId].defaults } } }
  }
}
