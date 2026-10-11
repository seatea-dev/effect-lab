import { expect, test } from 'vitest'
import { drawHalftone, halftone, type HalftonePainter, type HalftonePlan } from '../src/effects/halftone'
import { palettes } from '../src/definitions/palettes'

function finish<T>(job: Generator<void, T>) {
  let step = job.next()
  while (!step.done) step = job.next()
  return step.value
}

function solid(width: number, height: number, value: number) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set([value, value, value, 255], offset)
  return pixels
}

const params = { spacing: 10, contrast: 1, palette: 'ink' as const }

function recordCircles(plan: HalftonePlan, width: number, height: number) {
  const circles: Array<{ x: number; y: number; radius: number }> = []
  let clipRect: [number, number, number, number] | undefined
  let clipped = false
  const painter: HalftonePainter = {
    fillStyle: '',
    save() {}, restore() {}, beginPath() {},
    rect(x, y, rectWidth, rectHeight) { clipRect = [x, y, rectWidth, rectHeight] },
    clip() { clipped = true },
    arc(x, y, radius) { circles.push({ x, y, radius }) },
    fill() {},
  }
  finish(drawHalftone(plan, painter, width, height))
  return { circles, clipRect, clipped }
}

test('white has zero radius and black has maximum cell radius', () => {
  const white = finish(halftone(solid(20, 20, 255), 20, 20, 200, 200, params))
  const black = finish(halftone(solid(20, 20, 0), 20, 20, 200, 200, params))
  expect([...white.radii].every((radius) => radius === 0)).toBe(true)
  expect([...black.radii].every((radius) => radius === 5)).toBe(true)
  expect(black.ink).toEqual(palettes.ink.ink)
  expect(black.paper).toEqual(palettes.ink.paper)
})

test('retains the selected palette ink and paper colors in the plan', () => {
  const plan = finish(halftone(solid(20, 20, 128), 20, 20, 200, 200, { ...params, palette: 'terminal' }))
  expect(plan.ink).toEqual(palettes.terminal.ink)
  expect(plan.paper).toEqual(palettes.terminal.paper)
})

test('radius follows the square root of area and contrast changes sampled darkness', () => {
  const midpoint = solid(20, 20, 128)
  const before = midpoint.slice()
  const normal = finish(halftone(midpoint, 20, 20, 200, 200, params))
  expect(normal.radii[0]).toBeCloseTo(5 * Math.sqrt(127 / 255), 5)
  const highContrast = finish(halftone(midpoint, 20, 20, 200, 200, { ...params, contrast: 2 }))
  expect(highContrast.radii[0]).toBeLessThan(normal.radii[0]!)
  expect(midpoint).toEqual(before)
})

test('averages each pixel after contrast clipping inside a mixed-tone cell', () => {
  const pixels = solid(120, 120, 0)
  // At 40-unit spacing this first normalized cell covers a 4 × 4 analysis patch.
  for (let y = 2; y < 4; y++) for (let x = 0; x < 4; x++) {
    const offset = (y * 120 + x) * 4
    pixels.set([192, 192, 192, 255], offset)
  }
  const plan = finish(halftone(pixels, 120, 120, 2000, 2000, { spacing: 40, contrast: 2, palette: 'ink' }))
  expect(plan.radii[0]).toBeCloseTo(40 * Math.sqrt(0.5), 4)
})

test('uses one normalized grid with partial cells at preview and portrait export sizes', () => {
  const input = solid(2, 20, 80)
  const plan = finish(halftone(input, 2, 20, 201, 2001, params))
  expect(plan.columns).toBe(2)
  expect(plan.rows).toBe(20)
  const collect = (width: number, height: number) => {
    const circles: Array<[number, number, number]> = []
    const painter: HalftonePainter = { fillStyle: '', save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, arc(x, y, radius) { circles.push([x, y, radius]) }, fill() {} }
    finish(drawHalftone(plan, painter, width, height))
    return circles
  }
  const preview = collect(2, 20)
  const exported = collect(201, 2001)
  expect(preview).toHaveLength(plan.columns * plan.rows)
  expect(exported).toHaveLength(plan.columns * plan.rows)
  expect(exported[1]?.[0]).toBeCloseTo(preview[1]![0] * 201 / 2, 8)
  expect(exported[plan.columns]?.[1]).toBeCloseTo(preview[plan.columns]![1] * 2001 / 20, 8)
  expect(exported.at(-1)?.[0]).toBeCloseTo(150.75, 8)
  expect(exported.at(-1)?.[1]).toBeCloseTo(1959.75, 8)
})

test('keeps normalized placement across landscape preview and export dimensions', () => {
  const plan = finish(halftone(solid(20, 2, 96), 20, 2, 2001, 201, params))
  expect(plan.columns).toBe(20)
  expect(plan.rows).toBe(2)
  const collect = (width: number, height: number) => {
    const circles: Array<[number, number, number]> = []
    const painter: HalftonePainter = { fillStyle: '', save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, arc(x, y, radius) { circles.push([x, y, radius]) }, fill() {} }
    finish(drawHalftone(plan, painter, width, height))
    return circles
  }
  const preview = collect(20, 2)
  const exported = collect(2001, 201)
  expect(exported).toHaveLength(40)
  expect(exported[1]?.[0]).toBeCloseTo(preview[1]![0] * 2001 / 20, 8)
  expect(exported[20]?.[1]).toBeCloseTo(preview[20]![1] * 201 / 2, 8)
  expect(exported.at(-1)?.[0]).toBeCloseTo(1959.75, 8)
  expect(exported.at(-1)?.[1]).toBeCloseTo(150.75, 8)
})

test.each([
  { width: 1001, height: 1000, columns: 26, rows: 25, rightCenters: [940, 980, 1020], bottomCenter: 980 },
  { width: 1000, height: 1001, columns: 25, rows: 26, rightCenters: [900, 940, 980], bottomCenter: 1020 },
  { width: 997, height: 733, columns: 35, rows: 25, rightCenters: [952.9, 982.22, 1011.54], bottomCenter: 718.34 },
])('keeps nominal centers for partial right and bottom cells on $width × $height images', ({ width, height, columns, rows, rightCenters, bottomCenter }) => {
  const plan = finish(halftone(solid(width, height, 0), width, height, width, height, { spacing: 40, contrast: 1, palette: 'ink' }))
  const { circles, clipRect, clipped } = recordCircles(plan, width, height)
  const firstRow = circles.slice(0, columns)
  const bottomRow = circles.slice(-columns)

  expect(plan.columns).toBe(columns)
  expect(plan.rows).toBe(rows)
  firstRow.slice(-3).forEach(({ x }, index) => expect(x).toBeCloseTo(rightCenters[index]!, 6))
  bottomRow.forEach(({ y }) => expect(y).toBeCloseTo(bottomCenter, 6))
  bottomRow.slice(-3).forEach(({ x }, index) => expect(x).toBeCloseTo(rightCenters[index]!, 6))
  expect(clipRect).toEqual([0, 0, width, height])
  expect(clipped).toBe(true)
})

test('samples only available pixels in partial right and bottom cells', () => {
  const rightEdge = solid(1001, 1000, 0)
  for (let y = 0; y < 1000; y++) rightEdge.set([255, 255, 255, 255], (y * 1001 + 1000) * 4)
  const rightPlan = finish(halftone(rightEdge, 1001, 1000, 1001, 1000, { spacing: 40, contrast: 1, palette: 'ink' }))
  expect(rightPlan.radii[25]).toBe(0)
  expect(rightPlan.radii[24]).toBe(20)

  const bottomEdge = solid(1000, 1001, 0)
  for (let x = 0; x < 1000; x++) bottomEdge.set([255, 255, 255, 255], (1000 * 1000 + x) * 4)
  const bottomPlan = finish(halftone(bottomEdge, 1000, 1001, 1000, 1001, { spacing: 40, contrast: 1, palette: 'ink' }))
  expect(bottomPlan.radii.slice(-bottomPlan.columns).every((radius) => radius === 0)).toBe(true)
  expect(bottomPlan.radii[(bottomPlan.rows - 2) * bottomPlan.columns]).toBe(20)
})

test('Newsprint stores its settings and keeps edits, resets, and source changes in session', async () => {
  const { createSession, isModified, sessionReducer } = await import('../src/session/state')
  let session = sessionReducer(createSession('urban'), { type: 'preset', id: 'newsprint' })
  expect(session).toMatchObject({ sourceId: 'urban', effectId: 'halftone', presetId: 'newsprint', parametersByEffect: { halftone: { spacing: 8, contrast: 1.15, palette: 'ink' } } })
  session = sessionReducer(session, { type: 'edit', effectId: 'halftone', params: { spacing: 12 } })
  expect(isModified(session)).toBe(true)
  expect(sessionReducer(session, { type: 'reset-preset' }).parametersByEffect.halftone).toEqual({ spacing: 8, contrast: 1.15, palette: 'ink' })
  const effectReset = sessionReducer(session, { type: 'reset-effect' })
  expect(effectReset.parametersByEffect.halftone).toEqual({ spacing: 10, contrast: 1, palette: 'ink' })
  expect(effectReset.sourceId).toBe('urban')
})
