import { expect, test } from 'vitest'
import { initialRenderState, renderStateReducer } from '../src/ui/renderState'

const accepted = {
  source: { width: 1920, height: 1153 },
  analysis: { width: 1200, height: 720 },
  export: { width: 1920, height: 1153 },
  downscaled: false,
}

test('worker failure and delayed retry keep the accepted preview until recovery succeeds', () => {
  let state = renderStateReducer(initialRenderState, { type: 'status', value: { phase: 'ready', exporting: false, sizes: accepted } })
  state = renderStateReducer(state, { type: 'status', value: { phase: 'error', exporting: false, error: 'Worker stopped.' } })
  expect(state.sizes).toBe(accepted)
  expect(state.phase).toBe('error')

  state = renderStateReducer(state, { type: 'retry' })
  expect(state.sizes).toBe(accepted)
  expect(state.phase).toBe('starting')
  expect(state.exporting).toBe(false)

  state = renderStateReducer(state, { type: 'status', value: { phase: 'ready', exporting: false, sizes: { ...accepted, source: { width: 800, height: 600 }, export: { width: 800, height: 600 }, analysis: { width: 800, height: 600 } } } })
  expect(state.sizes?.source).toEqual({ width: 800, height: 600 })
  expect(state.phase).toBe('ready')
})
