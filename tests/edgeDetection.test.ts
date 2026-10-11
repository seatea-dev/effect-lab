import { expect, test } from 'vitest'
import { edgeDetect } from '../src/effects/edgeDetection'

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
