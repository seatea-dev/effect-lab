import { expect, test } from 'vitest'
import { edgeDetect, edgeDetectBatched } from '../src/effects/edgeDetection'

const pixel = (r: number, g: number, b: number, a = 255) => [r, g, b, a]
const pixels = (...values: number[][]) => new Uint8ClampedArray(values.flat())
const edgeParams = { sensitivity: 50, invert: false }

test('flat fields produce only opaque Blueprint paper', () => {
  expect(edgeDetect(pixels(pixel(90, 90, 90), pixel(90, 90, 90)), 2, 1, edgeParams)).toEqual(
    pixels(pixel(18, 59, 99), pixel(18, 59, 99)),
  )
})

test('detects a vertical luminance boundary and swaps Blueprint colors when inverted', () => {
  const source = pixels(...Array.from({ length: 9 }, (_, index) => index % 3 === 0 ? pixel(0, 0, 0) : pixel(255, 255, 255)))
  const normal = edgeDetect(source, 3, 3, { sensitivity: 50, invert: false })
  const inverted = edgeDetect(source, 3, 3, { sensitivity: 50, invert: true })
  expect(Array.from(normal.slice(16, 20))).toEqual([188, 235, 255, 255])
  expect(Array.from(inverted.slice(16, 20))).toEqual([18, 59, 99, 255])
})

test('sensitivity endpoints include weak contours only at maximum and retain strong contours', () => {
  const weak = pixels(pixel(100, 100, 100), pixel(110, 110, 110), pixel(110, 110, 110))
  const atZero = edgeDetect(weak, 3, 1, { sensitivity: 0, invert: false })
  const atHundred = edgeDetect(weak, 3, 1, { sensitivity: 100, invert: false })
  expect(Array.from(atZero.slice(4, 7))).toEqual([18, 59, 99])
  expect(Array.from(atHundred.slice(4, 7))).toEqual([188, 235, 255])
  const strong = pixels(...Array.from({ length: 9 }, (_, index) => index < 4 ? pixel(255, 255, 255) : pixel(0, 0, 0)))
  expect(Array.from(edgeDetect(strong, 3, 3, { sensitivity: 0, invert: false }).slice(16, 19))).toEqual([18, 59, 99])
  expect(Array.from(edgeDetect(strong, 3, 3, { sensitivity: 21, invert: false }).slice(16, 19))).toEqual([188, 235, 255])
})

test('horizontal contours, clamped borders, and one-pixel images remain valid', () => {
  const horizontal = pixels(...[0, 0, 0, 255, 255, 255].map((level) => pixel(level, level, level)))
  const result = edgeDetect(horizontal, 2, 3, edgeParams)
  expect(Array.from(result.slice(8, 11))).toEqual([188, 235, 255])
  expect(Array.from(result.slice(0, 3))).toEqual([18, 59, 99])
  expect(edgeDetect(pixels(pixel(12, 80, 150, 7)), 1, 1, edgeParams)).toEqual(pixels(pixel(18, 59, 99)))
})

test('does not mutate input and validates dimensions and sensitivity', () => {
  const source = pixels(pixel(0, 0, 0), pixel(255, 255, 255))
  const before = source.slice()
  const result = edgeDetect(source, 2, 1, edgeParams)
  expect(source).toEqual(before)
  expect(result).not.toBe(source)
  expect(result).toHaveLength(source.length)
  for (let index = 3; index < result.length; index += 4) expect(result[index]).toBe(255)
  expect(() => edgeDetect(source, 1, 1, edgeParams)).toThrow()
  expect(() => edgeDetect(source, 2, 1, { sensitivity: 101, invert: false })).toThrow()
})

test.each([{ width: 7, height: 5 }, { width: 5, height: 7 }, { width: 9, height: 3 }])(
  'produces identical opaque pixels across row batch sizes for $width × $height fields',
  ({ width, height }) => {
    const source = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      source.set([(x * 31 + y * 17) % 256, (x * 7 + y * 43) % 256, (x * 19 + y * 11) % 256, (x + y) % 256], offset)
    }
    const finish = (batchRows: number) => {
      const job = edgeDetectBatched(source, width, height, { sensitivity: 61, invert: false }, batchRows)
      let result = job.next()
      while (!result.done) result = job.next()
      return result.value
    }
    const singleRows = finish(1)
    expect(finish(1)).toEqual(singleRows)
    expect(finish(3)).toEqual(singleRows)
    expect(finish(width + height)).toEqual(singleRows)
    for (let index = 3; index < singleRows.length; index += 4) expect(singleRows[index]).toBe(255)
  },
)

test('matches the normalized Sobel reference at every sensitivity step', () => {
  const width = 23
  const height = 17
  const source = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4
    source.set([(x * 31 + y * 17) % 256, (x * 7 + y * 43) % 256, (x * 19 + y * 11) % 256, 255], offset)
  }
  const luminance = new Float32Array(width * height)
  for (let index = 0; index < luminance.length; index++) {
    const offset = index * 4
    luminance[index] = 0.2126 * source[offset]! + 0.7152 * source[offset + 1]! + 0.0722 * source[offset + 2]!
  }
  for (let sensitivity = 0; sensitivity <= 100; sensitivity++) {
    const threshold = 1 - sensitivity / 100
    const expected = new Uint8ClampedArray(source.length)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const sample = (sampleX: number, sampleY: number) => luminance[Math.max(0, Math.min(height - 1, sampleY)) * width + Math.max(0, Math.min(width - 1, sampleX))]!
      const gx = -sample(x - 1, y - 1) + sample(x + 1, y - 1) - 2 * sample(x - 1, y) + 2 * sample(x + 1, y) - sample(x - 1, y + 1) + sample(x + 1, y + 1)
      const gy = -sample(x - 1, y - 1) - 2 * sample(x, y - 1) - sample(x + 1, y - 1) + sample(x - 1, y + 1) + 2 * sample(x, y + 1) + sample(x + 1, y + 1)
      const magnitude = Math.min(1, Math.hypot(gx, gy) / (4 * 255 * Math.SQRT2))
      const color = magnitude > 0 && magnitude >= threshold ? [188, 235, 255] : [18, 59, 99]
      expected.set([...color, 255], (y * width + x) * 4)
    }
    expect(edgeDetect(source, width, height, { sensitivity, invert: false })).toEqual(expected)
  }
})

test('matches the normalized Sobel comparison at the exact boundary for every sensitivity', () => {
  const source = pixels(
    pixel(0, 0, 0), pixel(0, 0, 0), pixel(0, 0, 0),
    pixel(0, 0, 0), pixel(0, 0, 0), pixel(128, 128, 128),
    pixel(0, 0, 0), pixel(128, 128, 128), pixel(254, 254, 254),
  )
  const magnitude = Math.min(1, Math.hypot(510, 510) / (4 * 255 * Math.SQRT2))

  for (let sensitivity = 0; sensitivity <= 100; sensitivity += 1) {
    const threshold = 1 - sensitivity / 100
    const expected = magnitude > 0 && magnitude >= threshold
      ? [188, 235, 255, 255]
      : [18, 59, 99, 255]
    const output = edgeDetect(source, 3, 3, { sensitivity, invert: false })
    expect(Array.from(output.slice(16, 20)), `sensitivity ${sensitivity}`).toEqual(expected)
  }

  expect(Array.from(edgeDetect(source, 3, 3, { sensitivity: 50, invert: false }).slice(16, 20)))
    .toEqual([188, 235, 255, 255])
})
