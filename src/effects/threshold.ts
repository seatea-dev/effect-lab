import { INK, PAPER } from '../definitions/palettes'
import type { ThresholdParams } from './types'

export function threshold(input: Uint8ClampedArray, params: ThresholdParams): Uint8ClampedArray {
  if (!Number.isInteger(params.cutoff) || params.cutoff < 0 || params.cutoff > 255 || typeof params.invert !== 'boolean') {
    throw new Error('Threshold settings must use a cutoff from 0 to 255 and an inversion toggle.')
  }
  if (input.length % 4 !== 0) throw new Error('Expected complete RGBA pixels.')
  const output = new Uint8ClampedArray(input.length)
  for (let i = 0; i < input.length; i += 4) {
    // Integer weights preserve exact gray/white cutoff boundaries.
    const light = (2126 * input[i] + 7152 * input[i + 1] + 722 * input[i + 2]) / 10000 >= params.cutoff
    const color = light !== params.invert ? PAPER : INK
    output[i] = color[0]
    output[i + 1] = color[1]
    output[i + 2] = color[2]
    output[i + 3] = 255
  }
  return output
}
