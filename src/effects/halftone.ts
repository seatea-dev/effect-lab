import { palettes } from '../definitions/palettes'
import type { PaletteId } from '../definitions/palettes'

export type HalftoneParams = { spacing: number; contrast: number; palette: PaletteId }
export type HalftonePlan = {
  sourceWidth: number
  sourceHeight: number
  spacingNumerator: number
  columns: number
  rows: number
  radii: Float32Array<ArrayBuffer>
  ink: readonly [number, number, number]
  paper: readonly [number, number, number]
}

export type HalftonePainter = {
  fillStyle: string | CanvasGradient | CanvasPattern
  save(): void
  restore(): void
  beginPath(): void
  rect(x: number, y: number, width: number, height: number): void
  clip(): void
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
  fill(): void
}

function validate(input: Uint8ClampedArray, width: number, height: number, sourceWidth: number, sourceHeight: number, params: HalftoneParams, batchRows: number) {
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1
    || input.length !== width * height * 4 || !Number.isSafeInteger(sourceWidth) || sourceWidth < 1
    || !Number.isSafeInteger(sourceHeight) || sourceHeight < 1) {
    throw new Error('Expected a complete RGBA image and valid source dimensions.')
  }
  if (!Number.isInteger(params.spacing) || params.spacing < 4 || params.spacing > 40
    || !Number.isFinite(params.contrast) || params.contrast < 0.5 || params.contrast > 2
    || Math.abs(params.contrast * 20 - Math.round(params.contrast * 20)) > 1e-8
    || !Object.hasOwn(palettes, params.palette) || !Number.isSafeInteger(batchRows) || batchRows < 1) {
    throw new Error('Halftone settings need spacing from 4 to 40, contrast from 0.5 to 2 in steps of 0.05, and a fixed palette.')
  }
}

function boundary(index: number, numerator: number, targetSize: number, sourceSize: number): number {
  return index === 0 ? 0 : Math.floor(index * numerator * targetSize / (1000 * sourceSize))
}

function targetCenter(index: number, numerator: number, targetSize: number, sourceSize: number): number {
  return (2 * index + 1) * numerator * targetSize / (2000 * sourceSize)
}

function count(sourceSize: number, numerator: number): number {
  return Math.ceil(sourceSize * 1000 / numerator)
}

/** Analyze contrast-adjusted cell darkness once for all target dimensions. */
export function* halftone(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  params: HalftoneParams,
  batchRows = 8,
): Generator<void, HalftonePlan> {
  validate(input, width, height, sourceWidth, sourceHeight, params, batchRows)
  const shortSide = Math.min(sourceWidth, sourceHeight)
  const spacingNumerator = Math.max(params.spacing * shortSide, Math.ceil(Math.max(1000 * sourceWidth / width, 1000 * sourceHeight / height)))
  const columns = count(sourceWidth, spacingNumerator)
  const rows = count(sourceHeight, spacingNumerator)
  const radii = new Float32Array(columns * rows)
  for (let cellY = 0; cellY < rows; cellY++) {
    const y0 = boundary(cellY, spacingNumerator, height, sourceHeight)
    const y1 = cellY === rows - 1 ? height : boundary(cellY + 1, spacingNumerator, height, sourceHeight)
    for (let cellX = 0; cellX < columns; cellX++) {
      const x0 = boundary(cellX, spacingNumerator, width, sourceWidth)
      const x1 = cellX === columns - 1 ? width : boundary(cellX + 1, spacingNumerator, width, sourceWidth)
      let weightedDarkness = 0
      let samples = 0
      const sampleX0 = x1 > x0 ? x0 : Math.min(width - 1, Math.floor((x0 + x1) / 2))
      const sampleX1 = x1 > x0 ? x1 : sampleX0 + 1
      const sampleY0 = y1 > y0 ? y0 : Math.min(height - 1, Math.floor((y0 + y1) / 2))
      const sampleY1 = y1 > y0 ? y1 : sampleY0 + 1
      for (let y = sampleY0; y < sampleY1; y++) for (let x = sampleX0; x < sampleX1; x++) {
        const offset = (y * width + x) * 4
        const luminance = (2126 * input[offset]! + 7152 * input[offset + 1]! + 722 * input[offset + 2]!) / 2_550_000
        const adjusted = Math.max(0, Math.min(1, 0.5 + params.contrast * (luminance - 0.5)))
        weightedDarkness += 1 - adjusted
        samples++
      }
      const darkness = weightedDarkness / samples
      radii[cellY * columns + cellX] = spacingNumerator / 2000 * Math.sqrt(darkness)
    }
    if ((cellY + 1) % batchRows === 0) yield
  }
  return { sourceWidth, sourceHeight, spacingNumerator, columns, rows, radii, ink: palettes[params.palette].ink, paper: palettes[params.palette].paper }
}

/** Draw the same logical circles at any target dimensions. Canvas edges clip overflow. */
export function* drawHalftone(
  plan: HalftonePlan,
  painter: HalftonePainter,
  targetWidth: number,
  targetHeight: number,
  batchRows = 8,
): Generator<void, void> {
  if (!Number.isSafeInteger(targetWidth) || targetWidth < 1 || !Number.isSafeInteger(targetHeight) || targetHeight < 1
    || !Number.isSafeInteger(batchRows) || batchRows < 1) throw new Error('Expected valid target dimensions.')
  painter.save()
  painter.beginPath()
  painter.rect(0, 0, targetWidth, targetHeight)
  painter.clip()
  painter.fillStyle = `rgb(${plan.ink[0]} ${plan.ink[1]} ${plan.ink[2]})`
  for (let cellY = 0; cellY < plan.rows; cellY++) {
    const centerY = targetCenter(cellY, plan.spacingNumerator, targetHeight, plan.sourceHeight)
    for (let cellX = 0; cellX < plan.columns; cellX++) {
      const centerX = targetCenter(cellX, plan.spacingNumerator, targetWidth, plan.sourceWidth)
      const radius = plan.radii[cellY * plan.columns + cellX]!
      if (radius <= 0) continue
      painter.beginPath()
      painter.arc(centerX, centerY, radius * targetWidth / plan.sourceWidth, 0, Math.PI * 2)
      painter.fill()
    }
    if ((cellY + 1) % batchRows === 0) yield
  }
  painter.restore()
}
