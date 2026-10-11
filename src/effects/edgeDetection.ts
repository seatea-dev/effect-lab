import { blueprintPalette } from '../definitions/palettes'

export type EdgeParams = { sensitivity: number; invert: boolean }

export const BLUEPRINT_INK = blueprintPalette.ink
export const BLUEPRINT_PAPER = blueprintPalette.paper

export function* edgeDetectBatched(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  params: EdgeParams,
  batchRows = 64,
): Generator<void, Uint8ClampedArray> {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 || input.length !== width * height * 4) {
    throw new Error('Edge detection needs complete RGBA pixels and valid image dimensions.')
  }
  if (!Number.isInteger(params.sensitivity) || params.sensitivity < 0 || params.sensitivity > 100 || typeof params.invert !== 'boolean') {
    throw new Error('Edge settings must use a sensitivity from 0 to 100 and an inversion toggle.')
  }

  if (!Number.isInteger(batchRows) || batchRows < 1) throw new Error('Edge processing batch size must be a positive integer.')

  const luminance = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      luminance[y * width + x] = 0.2126 * input[offset]! + 0.7152 * input[offset + 1]! + 0.0722 * input[offset + 2]!
    }
    if ((y + 1) % batchRows === 0 && y + 1 < height) yield
  }

  const output = new Uint8ClampedArray(input.length)
  const threshold = 1 - params.sensitivity / 100
  const ink = params.invert ? BLUEPRINT_PAPER : BLUEPRINT_INK
  const paper = params.invert ? BLUEPRINT_INK : BLUEPRINT_PAPER
  const sample = (x: number, y: number) => luminance[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))]!

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gx = -sample(x - 1, y - 1) + sample(x + 1, y - 1)
        - 2 * sample(x - 1, y) + 2 * sample(x + 1, y)
        - sample(x - 1, y + 1) + sample(x + 1, y + 1)
      const gy = -sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1)
        + sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1)
      const magnitude = Math.min(1, Math.hypot(gx, gy) / (4 * 255 * Math.SQRT2))
      const color = magnitude > 0 && magnitude >= threshold ? ink : paper
      const offset = (y * width + x) * 4
      output[offset] = color[0]
      output[offset + 1] = color[1]
      output[offset + 2] = color[2]
      output[offset + 3] = 255
    }
    if ((y + 1) % batchRows === 0 && y + 1 < height) yield
  }
  return output
}

export function edgeDetect(input: Uint8ClampedArray, width: number, height: number, params: EdgeParams): Uint8ClampedArray {
  const job = edgeDetectBatched(input, width, height, params)
  let result = job.next()
  while (!result.done) result = job.next()
  return result.value
}
