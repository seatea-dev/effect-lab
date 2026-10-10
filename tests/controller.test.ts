import { expect, test, vi } from 'vitest'
import { RenderController } from '../src/rendering/controller'
import type { RenderState } from '../src/rendering/controller'
import type { ClientMessage, WorkerMessage, WorkerPort, RenderRequest } from '../src/rendering/protocol'

class Port implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null
  onerror: WorkerPort['onerror'] = null
  sent: ClientMessage[] = []
  postMessage(message: ClientMessage) { this.sent.push(message) }
  terminate = vi.fn()
  reply(message: WorkerMessage) { this.onmessage?.({ data: message }) }
}

const sizes = { source: { width: 1920, height: 1153 }, analysis: { width: 1200, height: 720 }, export: { width: 1920, height: 1153 }, downscaled: false }
const snapshot = (revision: number) => ({ revision, source: { id: 'urban', url: '/urban.jpg' }, effectId: 'threshold' as const, params: { cutoff: 140, invert: false } })
function setup() {
  const port = new Port()
  const frames: (() => void)[] = []
  const previews: number[] = []
  const exports: number[] = []
  const states: RenderState[] = []
  const cancelFrame = vi.fn()
  const controller = new RenderController(port, {
    onState: (state) => { states.push(state) },
    onPreview: (_bitmap, request) => { previews.push(request.revision) },
    onExport: (_blob, request) => { exports.push(request.revision) },
  }, (callback) => { frames.push(callback); return cancelFrame })
  const hello = port.sent.find((message) => message.type === 'hello')!
  port.reply({ type: 'ready', instanceId: hello.instanceId })
  return { port, controller, previews, exports, states, cancelFrame, frames, flush: () => { frames.splice(0).forEach((callback) => callback()) } }
}
function lastRequest(port: Port): RenderRequest {
  return port.sent.filter((message): message is RenderRequest => message.type === 'render').at(-1)!
}

test('a completed older preview cannot replace the latest selection', () => {
  const { port, controller, previews, flush } = setup()
  controller.update(snapshot(1))
  flush()
  const old = lastRequest(port)
  controller.update(snapshot(2))
  flush()
  const close = vi.fn()
  port.reply({ type: 'preview', request: old, sizes, elapsedMs: 10, bitmap: { close } as unknown as ImageBitmap })
  expect(previews).toEqual([])
  expect(close).toHaveBeenCalledOnce()
  flush()
  const latest = lastRequest(port)
  port.reply({ type: 'preview', request: latest, sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(previews).toEqual([2])
})

test('a preview display failure is recoverable rather than an uncaught exception', () => {
  const port = new Port()
  const states: RenderState[] = []
  const frames: (() => void)[] = []
  const controller = new RenderController(port, {
    onState: (state) => states.push(state),
    onPreview: () => { throw new Error('Canvas unavailable') },
    onExport: () => {},
  }, (callback) => { frames.push(callback); return () => {} })
  port.reply({ type: 'ready', instanceId: port.sent[0].instanceId })
  controller.update(snapshot(1))
  frames.shift()!()
  expect(() => port.reply({ type: 'preview', request: lastRequest(port), sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })).not.toThrow()
  expect(states.at(-1)?.phase).toBe('error')
  expect(controller.exportPng()).toBe(false)
})

test('changing settings during PNG encoding prevents the old result from downloading', () => {
  const { port, controller, exports, flush } = setup()
  controller.update(snapshot(1))
  flush()
  port.reply({ type: 'preview', request: lastRequest(port), sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(controller.exportPng()).toBe(true)
  const encoding = lastRequest(port)
  controller.update(snapshot(2))
  port.reply({ type: 'export', request: encoding, blob: new Blob(['png'], { type: 'image/png' }) })
  expect(exports).toEqual([])
  flush()
  port.reply({ type: 'preview', request: lastRequest(port), sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(controller.exportPng()).toBe(true)
  port.reply({ type: 'export', request: lastRequest(port), blob: new Blob(['new png'], { type: 'image/png' }) })
  expect(exports).toEqual([2])
})

test('rapid changes keep only the latest pending preview rather than an unbounded queue', () => {
  const { port, controller, previews, flush } = setup()
  controller.update(snapshot(1)); flush()
  const running = lastRequest(port)
  for (let revision = 2; revision <= 100; revision++) { controller.update(snapshot(revision)); flush() }
  expect(port.sent.filter((message) => message.type === 'render')).toHaveLength(1)
  port.reply({ type: 'cancelled', request: running }); flush()
  const latest = lastRequest(port)
  expect(latest.revision).toBe(100)
  port.reply({ type: 'preview', request: latest, sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(previews).toEqual([100])
})

test('an older load failure cannot overwrite the new selection status', () => {
  const { port, controller, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  const old = lastRequest(port)
  controller.update({ ...snapshot(2), source: { id: 'fixture', url: '/fixture.jpg' } })
  port.reply({ type: 'error', request: old, message: 'Old sample failed' }); flush()
  expect(states.at(-1)?.error).toBeUndefined()
  expect(lastRequest(port).source.id).toBe('fixture')
})

test('a current preview failure prevents export and can be retried without new settings', () => {
  const { port, controller, previews, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  const failed = lastRequest(port)
  port.reply({ type: 'error', request: failed, message: 'Sample failed' })
  expect(states.at(-1)?.error).toBe('Sample failed')
  expect(controller.exportPng()).toBe(false)
  controller.update(snapshot(1)); flush()
  const retried = lastRequest(port)
  port.reply({ type: 'preview', request: retried, sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  port.reply({ type: 'error', request: failed, message: 'Late failure' })
  expect(states.at(-1)?.phase).toBe('ready')
  expect(states.at(-1)?.error).toBeUndefined()
  expect(previews).toEqual([1])
})

test('an export failure preserves the preview and allows retry', () => {
  const { port, controller, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  port.reply({ type: 'preview', request: lastRequest(port), sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  controller.exportPng()
  port.reply({ type: 'error', request: lastRequest(port), message: 'Encoder failed' })
  expect(states.at(-1)?.phase).toBe('ready')
  expect(states.at(-1)?.notice).toContain('Encoder failed')
  expect(controller.exportPng()).toBe(true)
})

test('disposal rejects delayed results and releases their bitmap', () => {
  const { port, controller, previews, flush } = setup()
  controller.update(snapshot(1)); flush()
  const deliver = port.onmessage!
  const request = lastRequest(port)
  controller.dispose()
  expect(port.terminate).toHaveBeenCalledOnce()
  const close = vi.fn()
  deliver({ data: { type: 'preview', request, sizes, elapsedMs: 10, bitmap: { close } as unknown as ImageBitmap } })
  expect(previews).toEqual([])
  expect(close).toHaveBeenCalledOnce()
  expect(controller.exportPng()).toBe(false)
})

test('disposal cancels a pending frame and prevents later requests', () => {
  const { port, controller, cancelFrame, frames } = setup()
  controller.update(snapshot(1))
  const pendingFrame = frames[0]
  const sentBeforeDispose = port.sent.length

  controller.dispose()
  expect(port.terminate).toHaveBeenCalledOnce()
  expect(cancelFrame).toHaveBeenCalledOnce()
  pendingFrame()
  controller.update(snapshot(2))

  expect(port.sent).toHaveLength(sentBeforeDispose)
  expect(port.sent.filter((message) => message.type === 'render')).toHaveLength(0)
  expect(controller.exportPng()).toBe(false)
})

test('export cannot start before the current preview is ready or while another export runs', () => {
  const { port, controller, flush } = setup()
  controller.update(snapshot(1)); flush()
  expect(controller.exportPng()).toBe(false)
  port.reply({ type: 'preview', request: lastRequest(port), sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(controller.exportPng()).toBe(true)
  expect(controller.exportPng()).toBe(false)
})

test('switching between Threshold and Dither rejects the obsolete preview and error', () => {
  const { port, controller, previews, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  const thresholdRequest = lastRequest(port)
  controller.update({ ...snapshot(2), effectId: 'dither', params: { contrast: 1.2, palette: 'vintage' } })
  const close = vi.fn()
  port.reply({ type: 'preview', request: thresholdRequest, sizes, elapsedMs: 10, bitmap: { close } as unknown as ImageBitmap })
  expect(close).toHaveBeenCalledOnce()
  expect(previews).toEqual([])
  flush()
  const ditherRequest = lastRequest(port)
  expect(ditherRequest.effectId).toBe('dither')
  port.reply({ type: 'error', request: thresholdRequest, message: 'Obsolete threshold error' })
  expect(states.at(-1)?.error).toBeUndefined()
  port.reply({ type: 'preview', request: ditherRequest, sizes, elapsedMs: 10, bitmap: { close: () => {} } as ImageBitmap })
  expect(previews).toEqual([2])
  expect(controller.exportPng()).toBe(true)
})
