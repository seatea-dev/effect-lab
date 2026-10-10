import type { DitherParams } from './dither'

export type ThresholdParams = { cutoff: number; invert: boolean }
export type ParametersByEffect = { threshold: ThresholdParams; dither: DitherParams }
export type EffectId = keyof ParametersByEffect
export type EffectSelection = {
  [Id in EffectId]: { effectId: Id; params: ParametersByEffect[Id] }
}[EffectId]
export type EffectEdit = {
  [Id in EffectId]: { effectId: Id; params: Partial<ParametersByEffect[Id]> }
}[EffectId]
