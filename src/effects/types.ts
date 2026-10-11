import type { DitherParams } from './dither'
import type { PixelationParams } from './pixelation'
import type { EdgeParams } from './edgeDetection'
import type { HalftoneParams } from './halftone'
import type { AsciiParams } from './ascii'

export type ThresholdParams = { cutoff: number; invert: boolean }
export type ParametersByEffect = { threshold: ThresholdParams; dither: DitherParams; pixelation: PixelationParams; edge: EdgeParams; halftone: HalftoneParams; ascii: AsciiParams }
export type EffectId = keyof ParametersByEffect
export type EffectSelection = {
  [Id in EffectId]: { effectId: Id; params: ParametersByEffect[Id] }
}[EffectId]
export type EffectEdit = {
  [Id in EffectId]: { effectId: Id; params: Partial<ParametersByEffect[Id]> }
}[EffectId]
