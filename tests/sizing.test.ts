import { expect, test } from 'vitest'
import { imageSizes } from '../src/rendering/sizing'

test('a large image gets a bounded analysis image and the displayed capped export size', () => {
  expect(imageSizes(6000, 4000)).toEqual({
    source: { width: 6000, height: 4000 },
    analysis: { width: 1200, height: 800 },
    export: { width: 4242, height: 2828 },
    downscaled: true,
  })
})

test('small images are never upscaled for analysis or export', () => {
  expect(imageSizes(7, 3)).toEqual({ source: { width: 7, height: 3 }, analysis: { width: 7, height: 3 }, export: { width: 7, height: 3 }, downscaled: false })
})

test('an image exactly at the export cap keeps its dimensions', () => {
  expect(imageSizes(4000, 3000).export).toEqual({ width: 4000, height: 3000 })
  expect(imageSizes(4000, 3000).downscaled).toBe(false)
})

test('portrait and one-pixel-wide sources remain within output limits', () => {
  expect(imageSizes(4000, 6000).export).toEqual({ width: 2828, height: 4242 })
  expect(imageSizes(1, 25_000_000).export).toEqual({ width: 1, height: 12_000_000 })
})

test.each([0, -1, NaN, Infinity, 1.5])('invalid source dimension %s is rejected', (width) => {
  expect(() => imageSizes(width, 100)).toThrow()
})
