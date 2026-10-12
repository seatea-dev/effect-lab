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
    let inputOffset = y * width * 4
    let luminanceOffset = y * width
    for (let x = 0; x < width; x += 1) {
      luminance[luminanceOffset++] = 0.2126 * input[inputOffset]! + 0.7152 * input[inputOffset + 1]! + 0.0722 * input[inputOffset + 2]!
      inputOffset += 4
    }
    if ((y + 1) % batchRows === 0 && y + 1 < height) yield
  }

  const output = new Uint8ClampedArray(input.length)
  const threshold = 1 - params.sensitivity / 100
  const ink = params.invert ? BLUEPRINT_PAPER : BLUEPRINT_INK
  const paper = params.invert ? BLUEPRINT_INK : BLUEPRINT_PAPER
  for (let y = 0; y < height; y += 1) {
    const upperRow = (y === 0 ? 0 : y - 1) * width
    const middleRow = y * width
    const lowerRow = (y === height - 1 ? y : y + 1) * width
    let outputOffset = middleRow * 4
    for (let x = 0; x < width; x += 1) {
      const left = x === 0 ? 0 : x - 1
      const right = x === width - 1 ? x : x + 1
      const topLeft = luminance[upperRow + left]!
      const top = luminance[upperRow + x]!
      const topRight = luminance[upperRow + right]!
      const middleLeft = luminance[middleRow + left]!
      const middleRight = luminance[middleRow + right]!
      const bottomLeft = luminance[lowerRow + left]!
      const bottom = luminance[lowerRow + x]!
      const bottomRight = luminance[lowerRow + right]!
      const gx = -topLeft + topRight - 2 * middleLeft + 2 * middleRight - bottomLeft + bottomRight
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
      const magnitude = Math.min(1, Math.hypot(gx, gy) / (4 * 255 * Math.SQRT2))
      const color = magnitude > 0 && magnitude >= threshold ? ink : paper
      output[outputOffset] = color[0]
      output[outputOffset + 1] = color[1]
      output[outputOffset + 2] = color[2]
      output[outputOffset + 3] = 255
      outputOffset += 4
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
