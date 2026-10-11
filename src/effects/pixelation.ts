export const COLOR_COUNTS = [8, 27, 64, 125, 216] as const
export type PixelationParams = { blockSize: number; colorCount: (typeof COLOR_COUNTS)[number] }

export type PixelationPainter = {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, width: number, height: number): void
}

export type PixelationPlan = {
  sourceWidth: number
  sourceHeight: number
  blockNumerator: number
  columns: number
  rows: number
  colors: Uint8Array<ArrayBuffer>
  colorIndices: Uint8Array<ArrayBuffer>
}

function validate(input: Uint8ClampedArray, width: number, height: number, sourceWidth: number, sourceHeight: number, params: PixelationParams, batchBlockRows: number) {
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1
    || input.length !== width * height * 4 || !Number.isSafeInteger(sourceWidth) || sourceWidth < 1
    || !Number.isSafeInteger(sourceHeight) || sourceHeight < 1) {
    throw new Error('Expected a complete RGBA image and valid source dimensions.')
  }
  if (!Number.isInteger(params.blockSize) || params.blockSize < 4 || params.blockSize > 64
    || !COLOR_COUNTS.includes(params.colorCount)
    || !Number.isSafeInteger(batchBlockRows) || batchBlockRows < 1) {
    throw new Error('Pixelation settings need a block size from 4 to 64 and a supported color count.')
  }
}

function quantize(channel: number, levels: number): number {
  // Adding one half before floor makes exact ties round upward.
  const level = Math.floor(channel / 255 * (levels - 1) + 0.5)
  return Math.floor(level * 255 / (levels - 1) + 0.5)
}

function boundary(index: number, numerator: number, targetSize: number, sourceSize: number): number {
  if (index === 0) return 0
  const scaledNumerator = index * numerator
  // Keep the arithmetic in integer-index numerators until the final division.
  return Math.floor((scaledNumerator * targetSize) / (1000 * sourceSize))
}

function blockCount(sourceSize: number, numerator: number): number {
  return Math.ceil(sourceSize * 1000 / numerator)
}

function colorFor(input: Uint8ClampedArray, width: number, height: number, x0: number, x1: number, y0: number, y1: number, levels: number): readonly [number, number, number] {
  // At extreme aspect ratios a normalized cell may be smaller than an analysis
  // pixel. Sample its nearest center so every drawable target cell has a color.
  if (x1 <= x0 || y1 <= y0) {
    const x = Math.min(width - 1, Math.max(0, Math.floor((x0 + x1) / 2)))
    const y = Math.min(height - 1, Math.max(0, Math.floor((y0 + y1) / 2)))
    const offset = (y * width + x) * 4
    return [quantize(input[offset], levels), quantize(input[offset + 1], levels), quantize(input[offset + 2], levels)]
  }

  let red = 0
  let green = 0
  let blue = 0
  let count = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const offset = (y * width + x) * 4
      red += input[offset]
      green += input[offset + 1]
      blue += input[offset + 2]
      count++
    }
  }
  return [
    quantize(red / count, levels),
    quantize(green / count, levels),
    quantize(blue / count, levels),
  ]
}

/** Analyze each normalized cell once and retain only its palette color index. */
export function* pixelate(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  params: PixelationParams,
  batchBlockRows = 8,
): Generator<void, PixelationPlan> {
  validate(input, width, height, sourceWidth, sourceHeight, params, batchBlockRows)
  const sourceShortSide = Math.min(sourceWidth, sourceHeight)
  const analysisPixelScale = Math.max(Math.ceil(1000 * sourceWidth / width), Math.ceil(1000 * sourceHeight / height))
  // Match the existing one-analysis-pixel minimum at very small scales while
  // expressing all cell boundaries as rational source-space coordinates.
  const blockNumerator = Math.max(params.blockSize * sourceShortSide, analysisPixelScale)
  const columns = blockCount(sourceWidth, blockNumerator)
  const rows = blockCount(sourceHeight, blockNumerator)
  const levels = Math.round(Math.cbrt(params.colorCount))
  const colors = new Uint8Array(params.colorCount * 3)
  const colorIndices = new Uint8Array(columns * rows)
  const paletteIndices = new Map<number, number>()
  let paletteSize = 0

  for (let blockY = 0; blockY < rows; blockY++) {
    const y0 = boundary(blockY, blockNumerator, height, sourceHeight)
    const y1 = blockY === rows - 1 ? height : boundary(blockY + 1, blockNumerator, height, sourceHeight)
    for (let blockX = 0; blockX < columns; blockX++) {
      const x0 = boundary(blockX, blockNumerator, width, sourceWidth)
      const x1 = blockX === columns - 1 ? width : boundary(blockX + 1, blockNumerator, width, sourceWidth)
      const index = blockY * columns + blockX
      const color = colorFor(input, width, height, x0, x1, y0, y1, levels)
      const colorKey = (color[0] << 16) | (color[1] << 8) | color[2]
      let paletteIndex = paletteIndices.get(colorKey)
      if (paletteIndex === undefined) {
        paletteIndex = paletteSize++
        paletteIndices.set(colorKey, paletteIndex)
        colors.set(color, paletteIndex * 3)
      }
      colorIndices[index] = paletteIndex
    }
    if ((blockY + 1) % batchBlockRows === 0) yield
  }
  return { sourceWidth, sourceHeight, blockNumerator, columns, rows, colors, colorIndices }
}

/** Paint the retained analysis colors using geometry for this target size. */
export function* drawPixelation(
  plan: PixelationPlan,
  painter: PixelationPainter,
  targetWidth: number,
  targetHeight: number,
  batchBlockRows = 8,
): Generator<void, void> {
  if (!Number.isSafeInteger(targetWidth) || targetWidth < 1 || !Number.isSafeInteger(targetHeight) || targetHeight < 1
    || !Number.isSafeInteger(batchBlockRows) || batchBlockRows < 1) throw new Error('Expected valid target dimensions.')
  for (let blockY = 0; blockY < plan.rows; blockY++) {
    const y0 = boundary(blockY, plan.blockNumerator, targetHeight, plan.sourceHeight)
    const y1 = blockY === plan.rows - 1 ? targetHeight : boundary(blockY + 1, plan.blockNumerator, targetHeight, plan.sourceHeight)
    for (let blockX = 0; blockX < plan.columns; blockX++) {
      const x0 = boundary(blockX, plan.blockNumerator, targetWidth, plan.sourceWidth)
      const x1 = blockX === plan.columns - 1 ? targetWidth : boundary(blockX + 1, plan.blockNumerator, targetWidth, plan.sourceWidth)
      const index = blockY * plan.columns + blockX
      const colorOffset = plan.colorIndices[index] * 3
      painter.fillStyle = `rgb(${plan.colors[colorOffset]} ${plan.colors[colorOffset + 1]} ${plan.colors[colorOffset + 2]})`
      if (x1 > x0 && y1 > y0) painter.fillRect(x0, y0, x1 - x0, y1 - y0)
    }
    if ((blockY + 1) % batchBlockRows === 0) yield
  }
}
