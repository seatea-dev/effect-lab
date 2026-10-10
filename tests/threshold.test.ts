import { expect, test } from 'vitest'
import { threshold } from '../src/effects/threshold'

test('threshold separates darkness from paper at the cutoff without changing the source', () => {
  const input = new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255])
  const before = input.slice()
  expect(threshold(input, { cutoff: 128, invert: false })).toEqual(
    new Uint8ClampedArray([23, 23, 23, 255, 244, 241, 232, 255, 244, 241, 232, 255]),
  )
  expect(input).toEqual(before)
})

test('threshold rejects invalid cutoff values rather than silently producing the wrong image', () => {
  expect(() => threshold(new Uint8ClampedArray([128, 128, 128, 255]), { cutoff: NaN, invert: false })).toThrow()
})

test('threshold weights green more strongly than red and blue', () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
  expect(threshold(pixels, { cutoff: 128, invert: false })).toEqual(
    new Uint8ClampedArray([23, 23, 23, 255, 244, 241, 232, 255, 23, 23, 23, 255]),
  )
})

test('cutoff endpoints and inversion keep an opaque two-color image', () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
  expect(threshold(pixels, { cutoff: 0, invert: false })).toEqual(new Uint8ClampedArray([244, 241, 232, 255, 244, 241, 232, 255]))
  expect(threshold(pixels, { cutoff: 255, invert: true })).toEqual(new Uint8ClampedArray([244, 241, 232, 255, 23, 23, 23, 255]))
})

test.each([-1, 256, 128.5, Infinity])('invalid cutoff %s cannot produce a misleading image', (cutoff) => {
  expect(() => threshold(new Uint8ClampedArray([0, 0, 0, 255]), { cutoff, invert: false })).toThrow()
})

test('an incomplete pixel buffer is rejected', () => {
  expect(() => threshold(new Uint8ClampedArray([0, 0, 0]), { cutoff: 128, invert: false })).toThrow()
})
