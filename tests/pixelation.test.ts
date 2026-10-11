import { expect, test } from 'vitest'
import { COLOR_COUNTS, drawPixelation, pixelate, type PixelationPainter } from '../src/effects/pixelation'

function finish<T>(job: Generator<void, T>) {
  let step = job.next()
  while (!step.done) step = job.next()
  return step.value
}

function rasterPainter(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  const painter: PixelationPainter = {
    fillStyle: '',
    fillRect(x, y, w, h) {
      const color = String(this.fillStyle).match(/\d+/g)?.map(Number) ?? [0, 0, 0]
      const x0 = Math.max(0, Math.floor(x))
      const y0 = Math.max(0, Math.floor(y))
      const x1 = Math.min(width, Math.floor(x + w))
      const y1 = Math.min(height, Math.floor(y + h))
      for (let row = y0; row < y1; row++) for (let column = x0; column < x1; column++) {
        pixels.set([color[0], color[1], color[2], 255], (row * width + column) * 4)
      }
    },
  }
  return { pixels, painter }
}

function analyze(pixels: Uint8ClampedArray, analysisWidth: number, analysisHeight: number, sourceWidth = analysisWidth, sourceHeight = analysisHeight, blockSize = 20, colorCount: typeof COLOR_COUNTS[number] = 27) {
  return finish(pixelate(pixels, analysisWidth, analysisHeight, sourceWidth, sourceHeight, { blockSize, colorCount }))
}

function solid(width: number, height: number, color: readonly [number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set([...color, 255], offset)
  return pixels
}

test.each([[255, 255], [58, 58], [116, 116], [232, 232], [301, 299]])(
  'covers every pixel opaquely for uniform white %i × %i images', (width, height) => {
    const plan = analyze(solid(width, height, [255, 255, 255]), width, height)
    const { pixels, painter } = rasterPainter(width, height)
    finish(drawPixelation(plan, painter, width, height))

    for (let offset = 0; offset < pixels.length; offset += 4) {
      expect(Array.from(pixels.slice(offset, offset + 4))).toEqual([255, 255, 255, 255])
    }
  },
)

test('draws normalized block boundaries at the target resolution', () => {
  const sourceWidth = 2001
  const sourceHeight = 201
  const analysisWidth = 1200
  const analysisHeight = 120
  const plan = analyze(solid(analysisWidth, analysisHeight, [128, 128, 128]), analysisWidth, analysisHeight, sourceWidth, sourceHeight)
  const boundaries: Array<[number, number, number, number]> = []
  const painter: PixelationPainter = { fillStyle: '', fillRect: (x, y, width, height) => { boundaries.push([x, y, width, height]) } }

  finish(drawPixelation(plan, painter, sourceWidth, sourceHeight))

  const last = boundaries[boundaries.length - 1]
  if (!last) throw new Error('Expected exported block rectangles.')
  expect(boundaries.slice(0, 6).map(([x]) => x)).toEqual([0, 4, 8, 12, 16, 20])
  expect(boundaries.slice(0, 6).map(([,, width]) => width)).toEqual([4, 4, 4, 4, 4, 4])
  expect(last[0] + last[2]).toBe(sourceWidth)
  expect(last[1] + last[3]).toBe(sourceHeight)
})

test('draws one analyzed plan with independent preview and export geometry', () => {
  const sourceWidth = 2001
  const sourceHeight = 201
  const plan = analyze(solid(1200, 120, [64, 128, 192]), 1200, 120, sourceWidth, sourceHeight)
  const collect = (width: number, height: number) => {
    const rectangles: Array<[number, number, number, number]> = []
    finish(drawPixelation(plan, { fillStyle: '', fillRect: (x, y, w, h) => rectangles.push([x, y, w, h]) }, width, height))
    return rectangles
  }
  const preview = collect(1200, 120)
  const exported = collect(sourceWidth, sourceHeight)
  const last = exported[exported.length - 1]
  if (!last) throw new Error('Expected exported block rectangles.')

  expect(preview[1]?.[0]).toBe(2)
  expect(exported.slice(0, 6).map(([x]) => x)).toEqual([0, 4, 8, 12, 16, 20])
  expect(last[0] + last[2]).toBe(sourceWidth)
  expect(last[1] + last[3]).toBe(sourceHeight)
})

test('keeps normalized block geometry for portrait output and partial final cells', () => {
  const sourceWidth = 201
  const sourceHeight = 2001
  const plan = analyze(solid(120, 1200, [64, 128, 192]), 120, 1200, sourceWidth, sourceHeight)
  const rectangles: Array<[number, number, number, number]> = []
  finish(drawPixelation(plan, { fillStyle: '', fillRect: (x, y, w, h) => rectangles.push([x, y, w, h]) }, sourceWidth, sourceHeight))
  const last = rectangles[rectangles.length - 1]
  if (!last) throw new Error('Expected portrait block rectangles.')

  const firstColumn = rectangles.filter(([x]) => x === 0)
  expect(firstColumn.slice(0, 6).map(([, y]) => y)).toEqual([0, 4, 8, 12, 16, 20])
  expect(firstColumn.slice(0, 6).map(([, , , height]) => height)).toEqual([4, 4, 4, 4, 4, 4])
  expect(last[0] + last[2]).toBe(sourceWidth)
  expect(last[1] + last[3]).toBe(sourceHeight)
})

test.each(COLOR_COUNTS)('keeps analyzed colors within the %i-color palette', (colorCount) => {
  const width = 64
  const height = 64
  const input = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < input.length; offset += 4) {
    input[offset] = offset % 256
    input[offset + 1] = Math.floor(offset / 4) % 256
    input[offset + 2] = Math.floor(offset / 12) % 256
    input[offset + 3] = 255
  }
  const plan = analyze(input, width, height, width, height, 4, colorCount)
  const { pixels, painter } = rasterPainter(width, height)
  finish(drawPixelation(plan, painter, width, height))
  const colors = new Set<string>()
  for (let offset = 0; offset < pixels.length; offset += 4) colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`)
  expect(colors.size).toBeLessThanOrEqual(colorCount)
})

test('averages block colors and uses deterministic half-up quantization at endpoints', () => {
  const width = 250
  const height = 250
  const input = solid(width, height, [0, 0, 0])
  const setCell = (blockX: number, values: readonly number[]) => values.forEach((value, index) => {
    const offset = (Math.floor(index / 2) * width + blockX * 2 + index % 2) * 4
    input.set([value, value, value, 255], offset)
  })
  setCell(0, [42, 43, 42, 43])
  setCell(1, [0, 255, 0, 255])
  setCell(2, [0, 0, 0, 0])
  setCell(3, [255, 255, 255, 255])
  const plan = analyze(input, width, height, width, height, 8, 64)
  const { pixels, painter } = rasterPainter(width, height)
  finish(drawPixelation(plan, painter, width, height))
  expect(pixels[0]).toBe(85)
  expect(pixels[2 * 4]).toBe(170)
  expect(pixels[4 * 4]).toBe(0)
  expect(pixels[6 * 4]).toBe(255)
  expect(pixels[6 * 4 + 3]).toBe(255)
})
