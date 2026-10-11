import { describe, expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { ascii, asciiGlyphIndexForDarkness, drawAscii } from '../src/effects/ascii'
import { GLYPH_COVERAGE, GLYPH_RAMP, GLYPH_TILE_HEIGHT, GLYPH_TILE_WIDTH } from '../src/effects/asciiAtlas'

function analyze(input: Uint8ClampedArray, width: number, height: number, sourceWidth: number, sourceHeight: number, params: Parameters<typeof ascii>[5]) {
  const job = ascii(input, width, height, sourceWidth, sourceHeight, params)
  let result = job.next()
  while (!result.done) result = job.next()
  return result.value
}

function rgba(width: number, height: number, red: number, green = red, blue = red): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = red
    data[offset + 1] = green
    data[offset + 2] = blue
    data[offset + 3] = 255
  }
  return data
}

async function decodeAtlas() {
  const bytes = await readFile(new URL('../src/assets/terminal-atlas-v1.png', import.meta.url))
  const chunks: Buffer[] = []
  let width = 0
  let height = 0
  let offset = 8
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6) throw new Error('The atlas test decoder expects 8-bit RGBA PNG data.')
    }
    if (type === 'IDAT') chunks.push(data)
    offset += length + 12
    if (type === 'IEND') break
  }

  const stride = width * 4
  const filtered = inflateSync(Buffer.concat(chunks))
  const pixels = Buffer.alloc(height * stride)
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (stride + 1)]!
    for (let x = 0; x < stride; x++) {
      const source = filtered[y * (stride + 1) + x + 1]!
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0
      const above = y > 0 ? pixels[(y - 1) * stride + x]! : 0
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, upperLeft) : -1
      if (predictor < 0) throw new Error(`Unsupported PNG filter ${filter}.`)
      pixels[y * stride + x] = (source + predictor) & 0xff
    }
  }
  return { width, height, stride, pixels }
}

function atlasTileAlpha(atlas: Awaited<ReturnType<typeof decodeAtlas>>, column: number, row: number) {
  const { stride, pixels } = atlas
  const alpha = new Uint8Array(GLYPH_TILE_WIDTH * GLYPH_TILE_HEIGHT)
  let total = 0
  for (let y = 0; y < GLYPH_TILE_HEIGHT; y++) {
    for (let x = 0; x < GLYPH_TILE_WIDTH; x++) {
      const value = pixels[(row * GLYPH_TILE_HEIGHT + y) * stride + (column * GLYPH_TILE_WIDTH + x) * 4 + 3]!
      alpha[y * GLYPH_TILE_WIDTH + x] = value
      total += value
    }
  }
  return { alpha, coverage: total / (255 * GLYPH_TILE_WIDTH * GLYPH_TILE_HEIGHT) }
}

test('maps white, midtone, and black darkness to stable glyphs', () => {
  expect(GLYPH_RAMP[asciiGlyphIndexForDarkness(0)]).toBe(' ')
  expect(GLYPH_RAMP[asciiGlyphIndexForDarkness(0.5)]).toBe('X')
  expect(GLYPH_RAMP[asciiGlyphIndexForDarkness(1)]).toBe('@')
})

test('rounds exact glyph-coverage boundaries upward deterministically', () => {
  const boundary = 10.5 / (GLYPH_RAMP.length - 1)
  expect(asciiGlyphIndexForDarkness(boundary - 1e-10)).toBe(10)
  expect(asciiGlyphIndexForDarkness(boundary)).toBe(11)
  expect(asciiGlyphIndexForDarkness(boundary + 1e-10)).toBe(11)
})

test('measures the shipped atlas masks and verifies the ordered coverage ramp', async () => {
  const atlas = await decodeAtlas()
  const paletteRows = 3
  expect(atlas.width).toBe(GLYPH_TILE_WIDTH * GLYPH_RAMP.length)
  expect(atlas.height).toBe(GLYPH_TILE_HEIGHT * paletteRows)
  expect(GLYPH_COVERAGE).toHaveLength(GLYPH_RAMP.length)
  const measured = GLYPH_RAMP.split('').map((_, column) => atlasTileAlpha(atlas, column, 0))
  for (let column = 1; column < measured.length; column++) {
    expect(measured[column]!.coverage, `${GLYPH_RAMP[column - 1]} then ${GLYPH_RAMP[column]}`).toBeGreaterThanOrEqual(measured[column - 1]!.coverage)
  }
  const oneAlphaLevelPerPixel = 1 / (255 * GLYPH_TILE_WIDTH * GLYPH_TILE_HEIGHT)
  measured.forEach(({ coverage }, index) => expect(Math.abs(GLYPH_COVERAGE[index]! - coverage)).toBeLessThanOrEqual(oneAlphaLevelPerPixel))
  let previousCoverage = measured[asciiGlyphIndexForDarkness(0)]!.coverage
  for (let step = 1; step <= 1000; step++) {
    const selectedCoverage = measured[asciiGlyphIndexForDarkness(step / 1000)]!.coverage
    expect(selectedCoverage).toBeGreaterThanOrEqual(previousCoverage)
    previousCoverage = selectedCoverage
  }
  for (let row = 1; row < paletteRows; row++) {
    for (let column = 0; column < GLYPH_RAMP.length; column++) {
      expect(atlasTileAlpha(atlas, column, row).alpha).toEqual(atlasTileAlpha(atlas, column, 0).alpha)
    }
  }
})

describe('ASCII cell analysis', () => {
  test('uniform white selects the lightest glyph and black selects the densest', () => {
    const white = analyze(rgba(80, 80, 255), 80, 80, 80, 80, { characterHeight: 40, contrast: 1, palette: 'ink' })
    const black = analyze(rgba(80, 80, 0), 80, 80, 80, 80, { characterHeight: 40, contrast: 1, palette: 'ink' })
    expect([...white.glyphIndices].every((index) => index === 0)).toBe(true)
    expect([...black.glyphIndices].every((index) => index === GLYPH_RAMP.length - 1)).toBe(true)
  })

  test('midtone and contrast produce stable ordered glyph choices', () => {
    const midtone = analyze(rgba(80, 80, 128), 80, 80, 80, 80, { characterHeight: 40, contrast: 1, palette: 'ink' })
    const highContrast = analyze(rgba(80, 80, 160), 80, 80, 80, 80, { characterHeight: 40, contrast: 1.5, palette: 'ink' })
    const softContrast = analyze(rgba(80, 80, 160), 80, 80, 80, 80, { characterHeight: 40, contrast: 0.5, palette: 'ink' })
    expect([...midtone.glyphIndices].every((index) => index === 11)).toBe(true)
    expect(highContrast.glyphIndices[0]).toBeLessThan(softContrast.glyphIndices[0]!)
  })

  test('selects opposite glyphs immediately around a quantization boundary', () => {
    const below = analyze(rgba(80, 80, 133), 80, 80, 80, 80, { characterHeight: 40, contrast: 1, palette: 'ink' })
    const above = analyze(rgba(80, 80, 134), 80, 80, 80, 80, { characterHeight: 40, contrast: 1, palette: 'ink' })
    expect(below.glyphIndices[0]).toBe(11)
    expect(above.glyphIndices[0]).toBe(10)
  })

  test('preserves input pixels and records palette and rectangular cell geometry', () => {
    const input = rgba(120, 80, 120)
    const before = input.slice()
    const plan = analyze(input, 120, 80, 120, 80, { characterHeight: 20, contrast: 1.25, palette: 'terminal' })
    expect(input).toEqual(before)
    expect(plan.palette).toBe('terminal')
    expect(plan.columns / plan.rows).toBeCloseTo((120 / 80) / (GLYPH_TILE_WIDTH / GLYPH_TILE_HEIGHT), 5)
  })

  test('clips partial right and bottom cells while keeping their full nominal rectangles', () => {
    const plan = analyze(rgba(1001, 997, 0), 1001, 997, 1001, 997, { characterHeight: 37, contrast: 1, palette: 'ink' })
    const calls: number[][] = []
    const painter = {
      fillStyle: '', fillRect() {},
      save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
      drawImage(_image: CanvasImageSource, ...coordinates: number[]) { calls.push(coordinates) },
    }
    const job = drawAscii(plan, painter, 1001, 997, {} as CanvasImageSource, 1)
    let result = job.next()
    while (!result.done) result = job.next()
    expect(plan.columns).toBe(46)
    expect(plan.rows).toBe(28)
    expect(calls.at(-1)?.slice(4)).toEqual([996, 996, 22, 36])
    expect(calls.at(-1)?.slice(0, 4)).toEqual([
      (GLYPH_RAMP.length - 1) * GLYPH_TILE_WIDTH,
      0,
      GLYPH_TILE_WIDTH,
      GLYPH_TILE_HEIGHT,
    ])
  })

  test('uses the same normalized cell positions at preview and export sizes', () => {
    const plan = analyze(rgba(1001, 997, 0), 1001, 997, 1001, 997, { characterHeight: 37, contrast: 1, palette: 'ink' })
    const lastCell = (width: number, height: number) => {
      const calls: number[][] = []
      const painter = { fillStyle: '', fillRect() {}, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, drawImage(_image: CanvasImageSource, ...coordinates: number[]) { calls.push(coordinates) } }
      const job = drawAscii(plan, painter, width, height, {} as CanvasImageSource, 1)
      let result = job.next()
      while (!result.done) result = job.next()
      return calls.at(-1)!.slice(4)
    }
    const preview = lastCell(501, 499)
    const exported = lastCell(2002, 1994)
    for (const [index, targetSize] of [[0, 501], [2, 501], [1, 499], [3, 499]] as const) {
      const normalizedPreview = preview[index]! / targetSize
      const normalizedExport = exported[index]! / (targetSize * 4)
      expect(Math.abs(normalizedExport - normalizedPreview)).toBeLessThanOrEqual(1 / targetSize + 1 / (targetSize * 4))
    }
  })
})
