import { palettes } from '../definitions/palettes'
import type { PaletteId } from '../definitions/palettes'

export type DitherParams = { contrast: number; palette: PaletteId }

/** Yield between row batches; diffusion rows belong to this job, not to a batch. */
export function* dither(input: Uint8ClampedArray, width: number, params: DitherParams, batchRows = 64): Generator<void, Uint8ClampedArray<ArrayBuffer>> {
  if (!Number.isFinite(params.contrast) || params.contrast < 0.5 || params.contrast > 2
    || Math.abs(params.contrast * 20 - Math.round(params.contrast * 20)) > 1e-8
    || !Object.hasOwn(palettes, params.palette)) {
    throw new Error('Dither settings need contrast from 0.5 to 2 in steps of 0.05 and a fixed palette.')
  }
  if (!Number.isSafeInteger(width) || width < 1 || input.length === 0 || input.length % (width * 4) !== 0) {
    throw new Error('Expected complete rows of RGBA pixels.')
  }
  if (!Number.isSafeInteger(batchRows) || batchRows < 1) throw new Error('Batch size must be a positive integer.')
  const palette = palettes[params.palette]
  const height = input.length / 4 / width
  const output = new Uint8ClampedArray(input.length)
  let current = new Float64Array(width)
  let next = new Float64Array(width)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const luminance = (2126 * input[offset] + 7152 * input[offset + 1] + 722 * input[offset + 2]) / 2_550_000
      const adjusted = Math.max(0, Math.min(1, 0.5 + params.contrast * (luminance - 0.5)))
      const darkness = 1 - adjusted + current[x]
      const ink = darkness >= 0.5
      const error = darkness - Number(ink)
      const color = ink ? palette.ink : palette.paper
      output[offset] = color[0]
      output[offset + 1] = color[1]
      output[offset + 2] = color[2]
      output[offset + 3] = 255
      if (x + 1 < width) current[x + 1] += error * 7 / 16
      if (y + 1 < height) {
        if (x > 0) next[x - 1] += error * 3 / 16
        next[x] += error * 5 / 16
        if (x + 1 < width) next[x + 1] += error / 16
      }
    }
    const completed = current
    current = next
    next = completed
    next.fill(0)
    if ((y + 1) % batchRows === 0) yield
  }
  return output
}
