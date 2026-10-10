import { expect, test } from 'vitest'
import type { DitherParams } from '../src/effects/dither'
import { dither } from '../src/effects/dither'

const gray = (values: number[]) => new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]))
function render(input: Uint8ClampedArray, width: number, params: DitherParams = { contrast: 1, palette: 'ink' }, batchRows = 64) {
  const job = dither(input, width, params, batchRows)
  let result = job.next()
  while (!result.done) result = job.next()
  return result.value
}

test('Floyd-Steinberg matches a hand-calculated 2 by 2 gray field without changing its source', () => {
  const input = gray([128, 128, 128, 128])
  const before = input.slice()
  // Darkness 127/255 produces paper, ink, ink, paper with the specified diffusion weights.
  expect(render(input, 2)).toEqual(new Uint8ClampedArray([
    244, 241, 232, 255, 23, 23, 23, 255,
    23, 23, 23, 255, 244, 241, 232, 255,
  ]))
  expect(input).toEqual(before)
})

test('each fixed palette maps binary coverage to opaque ink and paper', () => {
  const input = gray([0, 255])
  expect(render(input, 2, { contrast: 1.2, palette: 'vintage' })).toEqual(new Uint8ClampedArray([
    72, 59, 50, 255, 228, 213, 183, 255,
  ]))
  expect(render(input, 2, { contrast: 1, palette: 'terminal' })).toEqual(new Uint8ClampedArray([
    141, 255, 154, 255, 16, 26, 19, 255,
  ]))
})

test('invalid parameters and malformed images fail before producing misleading pixels', () => {
  const input = gray([128, 128])
  for (const contrast of [NaN, Infinity, 0.4, 2.1, 1.23]) {
    expect(() => render(input, 2, { contrast, palette: 'ink' })).toThrow()
  }
  expect(() => render(input, 2, { contrast: 1, palette: 'unknown' as DitherParams['palette'] })).toThrow()
  for (const width of [0, -1, 1.5, 3]) expect(() => render(input, width)).toThrow()
  expect(() => render(new Uint8ClampedArray([0, 0, 0]), 1)).toThrow()
  for (const rows of [0, -1, 1.5]) expect(() => render(input, 2, undefined, rows)).toThrow()
})

test('diffusion crosses row batches without changing the deterministic pattern', () => {
  const tiny = gray([128, 128, 128, 128])
  const literal = new Uint8ClampedArray([244, 241, 232, 255, 23, 23, 23, 255, 23, 23, 23, 255, 244, 241, 232, 255])
  for (const rows of [1, 2, 64]) expect(render(tiny, 2, undefined, rows)).toEqual(literal)
  // An irregular 7 by 137 image crosses multiple default batches and a partial final batch.
  const input = gray(Array.from({ length: 7 * 137 }, (_, i) => (i * 31 + Math.floor(i / 7) * 17) % 256))
  const expected = render(input, 7, { contrast: 1.2, palette: 'vintage' }, 137)
  for (const rows of [1, 2, 3, 16, 64, 128, 200]) {
    expect(render(input, 7, { contrast: 1.2, palette: 'vintage' }, rows)).toEqual(expected)
  }
})

test('uniform endpoints, one-pixel borders, and contrast follow the specified tonal rules', () => {
  expect(render(gray([0]), 1)).toEqual(new Uint8ClampedArray([23, 23, 23, 255]))
  expect(render(gray([255]), 1)).toEqual(new Uint8ClampedArray([244, 241, 232, 255]))
  // On a one-column field, only 5/16 reaches the next row. There is no row wrapping.
  expect(render(gray([128, 128, 128]), 1, undefined, 1)).toEqual(new Uint8ClampedArray([
    244, 241, 232, 255, 23, 23, 23, 255, 244, 241, 232, 255,
  ]))
  expect(render(gray([100, 160]), 2, { contrast: 2, palette: 'ink' })).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 244, 241, 232, 255,
  ]))
  expect(render(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]), 2)).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 244, 241, 232, 255,
  ]))
})

test('increasing contrast changes diffusion decisions on a dark gray pair', () => {
  const input = gray([100, 100])
  expect(render(input, 2, { contrast: 0.5, palette: 'ink' })).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 244, 241, 232, 255,
  ]))
  expect(render(input, 2, { contrast: 2, palette: 'ink' })).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 23, 23, 23, 255,
  ]))
})

test('non-square rows diffuse to in-bounds neighbors and uniform fields remain uniform', () => {
  // Worked row darkness after diffusion, rounded here only for explanation:
  // 0.608, 0.240, 0.791, then 0.138, 0.837, 0.329.
  expect(render(gray([100, 150, 80, 200, 60, 140]), 3, undefined, 1)).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 244, 241, 232, 255, 23, 23, 23, 255,
    244, 241, 232, 255, 23, 23, 23, 255, 244, 241, 232, 255,
  ]))
  expect(render(gray([0, 0, 0, 0]), 2)).toEqual(new Uint8ClampedArray([
    23, 23, 23, 255, 23, 23, 23, 255, 23, 23, 23, 255, 23, 23, 23, 255,
  ]))
  expect(render(gray([255, 255, 255, 255]), 2)).toEqual(new Uint8ClampedArray([
    244, 241, 232, 255, 244, 241, 232, 255, 244, 241, 232, 255, 244, 241, 232, 255,
  ]))
})
