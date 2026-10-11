import { palettes } from '../definitions/palettes'
import type { PaletteId } from '../definitions/palettes'
import { GLYPH_PALETTE_ROW, GLYPH_RAMP, GLYPH_TILE_HEIGHT, GLYPH_TILE_WIDTH } from './asciiAtlas'

export type AsciiParams = { characterHeight: number; contrast: number; palette: PaletteId }
export type AsciiPlan = {
  sourceWidth: number
  sourceHeight: number
  cellHeightNumerator: number
  columns: number
  rows: number
  glyphIndices: Uint8Array<ArrayBuffer>
  palette: PaletteId
  ink: readonly [number, number, number]
  paper: readonly [number, number, number]
}

export type AsciiPainter = {
  fillStyle: string | CanvasGradient | CanvasPattern
  save(): void
  restore(): void
  beginPath(): void
  rect(x: number, y: number, width: number, height: number): void
  clip(): void
  fillRect(x: number, y: number, width: number, height: number): void
  drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void
}

function validate(input: Uint8ClampedArray, width: number, height: number, sourceWidth: number, sourceHeight: number, params: AsciiParams, batchRows: number) {
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1
    || input.length !== width * height * 4 || !Number.isSafeInteger(sourceWidth) || sourceWidth < 1
    || !Number.isSafeInteger(sourceHeight) || sourceHeight < 1) {
    throw new Error('Expected a complete RGBA image and valid source dimensions.')
  }
  if (!Number.isInteger(params.characterHeight) || params.characterHeight < 12 || params.characterHeight > 64
    || !Number.isFinite(params.contrast) || params.contrast < 0.5 || params.contrast > 2
    || Math.abs(params.contrast * 20 - Math.round(params.contrast * 20)) > 1e-8
    || !Object.hasOwn(palettes, params.palette) || !Number.isSafeInteger(batchRows) || batchRows < 1) {
    throw new Error('ASCII settings need character height 12 to 64, contrast 0.5 to 2 in steps of 0.05, and a fixed palette.')
  }
}

function boundary(index: number, cellNumerator: number, targetSize: number, sourceSize: number, denominator: number): number {
  return index === 0 ? 0 : Math.floor(index * cellNumerator * targetSize / (denominator * sourceSize))
}

export function asciiGlyphIndexForDarkness(darkness: number): number {
  if (!Number.isFinite(darkness)) throw new Error('Darkness must be finite.')
  return Math.max(0, Math.min(GLYPH_RAMP.length - 1, Math.floor(Math.max(0, Math.min(1, darkness)) * (GLYPH_RAMP.length - 1) + 0.5)))
}

/** Analyze contrast-adjusted darkness once into normalized rectangular glyph cells. */
export function* ascii(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  params: AsciiParams,
  batchRows = 8,
): Generator<void, AsciiPlan> {
  validate(input, width, height, sourceWidth, sourceHeight, params, batchRows)
  const analysisPixelScale = Math.max(Math.ceil(1000 * sourceWidth / width), Math.ceil(1000 * sourceHeight / height))
  const cellHeightNumerator = Math.max(params.characterHeight * Math.min(sourceWidth, sourceHeight), Math.ceil(analysisPixelScale * 5 / 3))
  const cellWidthNumerator = cellHeightNumerator * 3
  const columns = Math.ceil(sourceWidth * 5000 / cellWidthNumerator)
  const rows = Math.ceil(sourceHeight * 1000 / cellHeightNumerator)
  const glyphIndices = new Uint8Array(columns * rows)

  for (let cellY = 0; cellY < rows; cellY++) {
    const y0 = Math.min(height, boundary(cellY, cellHeightNumerator, height, sourceHeight, 1000))
    const y1 = Math.min(height, boundary(cellY + 1, cellHeightNumerator, height, sourceHeight, 1000))
    for (let cellX = 0; cellX < columns; cellX++) {
      const x0 = Math.min(width, boundary(cellX, cellWidthNumerator, width, sourceWidth, 5000))
      const x1 = Math.min(width, boundary(cellX + 1, cellWidthNumerator, width, sourceWidth, 5000))
      let luminanceTotal = 0
      let samples = 0
      const sampleX0 = x1 > x0 ? x0 : Math.min(width - 1, Math.floor((x0 + x1) / 2))
      const sampleX1 = x1 > x0 ? x1 : sampleX0 + 1
      const sampleY0 = y1 > y0 ? y0 : Math.min(height - 1, Math.floor((y0 + y1) / 2))
      const sampleY1 = y1 > y0 ? y1 : sampleY0 + 1
      for (let y = sampleY0; y < sampleY1; y++) {
        for (let x = sampleX0; x < sampleX1; x++) {
          const offset = (y * width + x) * 4
          const luminance = (2126 * input[offset]! + 7152 * input[offset + 1]! + 722 * input[offset + 2]!) / 2_550_000
          luminanceTotal += Math.max(0, Math.min(1, 0.5 + params.contrast * (luminance - 0.5)))
          samples++
        }
      }
      const darkness = 1 - luminanceTotal / samples
      glyphIndices[cellY * columns + cellX] = asciiGlyphIndexForDarkness(darkness)
    }
    if ((cellY + 1) % batchRows === 0) yield
  }
  return {
    sourceWidth,
    sourceHeight,
    cellHeightNumerator,
    columns,
    rows,
    glyphIndices,
    palette: params.palette,
    ink: palettes[params.palette].ink,
    paper: palettes[params.palette].paper,
  }
}

/** Paint the same cell plan at any target size, clipping partial cells at the output edges. */
export function* drawAscii(
  plan: AsciiPlan,
  painter: AsciiPainter,
  targetWidth: number,
  targetHeight: number,
  atlas: CanvasImageSource,
  batchRows = 8,
): Generator<void, void> {
  if (!Number.isSafeInteger(targetWidth) || targetWidth < 1 || !Number.isSafeInteger(targetHeight) || targetHeight < 1
    || !Number.isSafeInteger(batchRows) || batchRows < 1) throw new Error('Expected valid target dimensions.')
  painter.save()
  painter.beginPath()
  painter.rect(0, 0, targetWidth, targetHeight)
  painter.clip()
  painter.fillStyle = `rgb(${plan.paper[0]} ${plan.paper[1]} ${plan.paper[2]})`
  painter.fillRect(0, 0, targetWidth, targetHeight)
  const cellWidthNumerator = plan.cellHeightNumerator * 3
  const paletteRow = GLYPH_PALETTE_ROW[plan.palette]
  for (let cellY = 0; cellY < plan.rows; cellY++) {
    const y0 = boundary(cellY, plan.cellHeightNumerator, targetHeight, plan.sourceHeight, 1000)
    const y1 = boundary(cellY + 1, plan.cellHeightNumerator, targetHeight, plan.sourceHeight, 1000)
    for (let cellX = 0; cellX < plan.columns; cellX++) {
      const x0 = boundary(cellX, cellWidthNumerator, targetWidth, plan.sourceWidth, 5000)
      const x1 = boundary(cellX + 1, cellWidthNumerator, targetWidth, plan.sourceWidth, 5000)
      const glyphIndex = plan.glyphIndices[cellY * plan.columns + cellX]!
      painter.drawImage(
        atlas,
        glyphIndex * GLYPH_TILE_WIDTH, paletteRow * GLYPH_TILE_HEIGHT, GLYPH_TILE_WIDTH, GLYPH_TILE_HEIGHT,
        x0, y0, x1 - x0, y1 - y0,
      )
    }
    if ((cellY + 1) % batchRows === 0) yield
  }
  painter.restore()
}
