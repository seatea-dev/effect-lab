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
const bitmap = (close = vi.fn()) => ({ close } as unknown as ImageBitmap)
const preview = (request: RenderRequest, processed = bitmap(), original = bitmap()): WorkerMessage => ({
  type: 'preview', request, sizes, elapsedMs: 10, bitmap: processed, originalBitmap: original,
})
function setup() {
  const port = new Port()
  const frames: (() => void)[] = []
  const previews: number[] = []
  const originals: ImageBitmap[] = []
  const exports: number[] = []
  const states: RenderState[] = []
  const cancelFrame = vi.fn()
  const controller = new RenderController(port, {
    onState: (state) => { states.push(state) },
    onPreview: (_bitmap, request, _sizes, _thumbnail, original) => { previews.push(request.revision); originals.push(original) },
    onExport: (_blob, request) => { exports.push(request.revision) },
  }, (callback) => { frames.push(callback); return cancelFrame })
  const hello = port.sent.find((message) => message.type === 'hello')!
  port.reply({ type: 'ready', instanceId: hello.instanceId })
  return { port, controller, previews, originals, exports, states, cancelFrame, frames, flush: () => { frames.splice(0).forEach((callback) => callback()) } }
}
function lastRequest(port: Port): RenderRequest {
  return port.sent.filter((message): message is RenderRequest => message.type === 'render').at(-1)!
}

test('a completed older preview cannot replace the latest selection', () => {
  const { port, controller, previews, originals, flush } = setup()
  controller.update(snapshot(1))
  flush()
  const old = lastRequest(port)
  controller.update(snapshot(2))
  flush()
  const close = vi.fn()
  const originalClose = vi.fn()
  port.reply(preview(old, bitmap(close), bitmap(originalClose)))
  expect(previews).toEqual([])
  expect(close).toHaveBeenCalledOnce()
  expect(originalClose).toHaveBeenCalledOnce()
  flush()
  const latest = lastRequest(port)
  const acceptedOriginal = bitmap()
  port.reply(preview(latest, bitmap(), acceptedOriginal))
  expect(previews).toEqual([2])
  expect(originals).toEqual([acceptedOriginal])
})

test('a valid preview delivers a matching original and processed pair before releasing both worker bitmaps', () => {
  const { port, controller, originals, flush } = setup()
  controller.update(snapshot(1)); flush()
  const processedClose = vi.fn()
  const originalClose = vi.fn()
  const original = bitmap(originalClose)
  port.reply(preview(lastRequest(port), bitmap(processedClose), original))

  expect(originals).toEqual([original])
  expect(processedClose).toHaveBeenCalledOnce()
  expect(originalClose).toHaveBeenCalledOnce()
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
  expect(() => port.reply(preview(lastRequest(port)))).not.toThrow()
  expect(states.at(-1)?.phase).toBe('error')
  expect(controller.exportPng()).toBe(false)
})

test('changing settings during PNG encoding prevents the old result from downloading', () => {
  const { port, controller, exports, flush } = setup()
  controller.update(snapshot(1))
  flush()
  port.reply(preview(lastRequest(port)))
  expect(controller.exportPng()).toBe(true)
  const encoding = lastRequest(port)
  controller.update(snapshot(2))
  port.reply({ type: 'export', request: encoding, blob: new Blob(['png'], { type: 'image/png' }) })
  expect(exports).toEqual([])
  flush()
  port.reply(preview(lastRequest(port)))
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
  port.reply(preview(latest))
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
  port.reply(preview(retried))
  port.reply({ type: 'error', request: failed, message: 'Late failure' })
  expect(states.at(-1)?.phase).toBe('ready')
  expect(states.at(-1)?.error).toBeUndefined()
  expect(previews).toEqual([1])
})

test('gallery navigation keeps worker failure recoverable until the worker restarts', () => {
  const { port, controller, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  port.reply(preview(lastRequest(port)))
  expect(states.at(-1)?.sizes).toEqual(sizes)
  port.onerror?.({ message: 'Worker crashed' })
  expect(states.at(-1)?.phase).toBe('error')
  expect(states.at(-1)?.sizes).toEqual(sizes)

  controller.update({ ...snapshot(2), source: { id: 'portrait', url: '/portrait.jpg' } })

  expect(states.at(-1)?.phase).toBe('error')
  expect(states.at(-1)?.error).toContain('Retry')
  expect(states.at(-1)?.sizes).toEqual(sizes)
  expect(controller.exportPng()).toBe(false)
  expect(port.sent.filter((message) => message.type === 'render')).toHaveLength(1)
})

test('an export failure preserves the preview and allows retry', () => {
  const { port, controller, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  port.reply(preview(lastRequest(port)))
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
  const originalClose = vi.fn()
  deliver({ data: preview(request, bitmap(close), bitmap(originalClose)) })
  expect(previews).toEqual([])
  expect(close).toHaveBeenCalledOnce()
  expect(originalClose).toHaveBeenCalledOnce()
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
  port.reply(preview(lastRequest(port)))
  expect(controller.exportPng()).toBe(true)
  expect(controller.exportPng()).toBe(false)
})

test('switching between Threshold and Dither rejects the obsolete preview and error', () => {
  const { port, controller, previews, states, flush } = setup()
  controller.update(snapshot(1)); flush()
  const thresholdRequest = lastRequest(port)
  controller.update({ ...snapshot(2), effectId: 'dither', params: { contrast: 1.2, palette: 'vintage' } })
  const close = vi.fn()
  const originalClose = vi.fn()
  port.reply(preview(thresholdRequest, bitmap(close), bitmap(originalClose)))
  expect(close).toHaveBeenCalledOnce()
  expect(originalClose).toHaveBeenCalledOnce()
  expect(previews).toEqual([])
  flush()
  const ditherRequest = lastRequest(port)
  expect(ditherRequest.effectId).toBe('dither')
  port.reply({ type: 'error', request: thresholdRequest, message: 'Obsolete threshold error' })
  expect(states.at(-1)?.error).toBeUndefined()
  port.reply(preview(ditherRequest))
  expect(previews).toEqual([2])
  expect(controller.exportPng()).toBe(true)
})

test('source preparation failure restores usable work through the source callback, but render errors offer retry', () => {
  const port = new Port()
  const frames: (() => void)[] = []
  const states: RenderState[] = []
  const failures: string[] = []
  const controller = new RenderController(port, {
    onState: (state) => states.push(state), onPreview: () => {}, onExport: () => {},
    onSourceError: (request, message) => {
      failures.push(message)
      controller.update({ ...snapshot(request.revision + 1), params: { cutoff: 190, invert: false } })
      return true
    },
  }, (callback) => { frames.push(callback); return () => {} })
  port.reply({ type: 'ready', instanceId: port.sent[0].instanceId })
  controller.update({ ...snapshot(1), source: { id: 'candidate', url: 'blob:upload' } }); frames.shift()!()
  port.reply({ type: 'error', request: lastRequest(port), stage: 'source', message: 'Invalid image' })
  expect(failures).toEqual(['Invalid image'])
  expect(states.at(-1)?.error).toBeUndefined()
  frames.shift()!()
  expect(lastRequest(port).source.id).toBe('urban')
  expect(lastRequest(port).params).toEqual({ cutoff: 190, invert: false })
  port.reply({ type: 'error', request: lastRequest(port), message: 'Renderer failed' })
  expect(failures).toHaveLength(1)
  expect(states.at(-1)?.phase).toBe('error')
})

test('a stale source error cannot invoke rollback for the current source', () => {
  const port = new Port(), frames: (() => void)[] = [], onSourceError = vi.fn(() => true)
  const controller = new RenderController(port, { onState: () => {}, onPreview: () => {}, onExport: () => {}, onSourceError }, (callback) => { frames.push(callback); return () => {} })
  port.reply({ type: 'ready', instanceId: port.sent[0].instanceId })
  controller.update(snapshot(1)); frames.shift()!()
  const old = lastRequest(port)
  controller.update({ ...snapshot(2), source: { id: 'portrait', url: '/portrait.jpg' } })
  port.reply({ type: 'error', request: old, stage: 'source', message: 'Old decode failed' })
  expect(onSourceError).not.toHaveBeenCalled()
  frames.shift()!()
  expect(lastRequest(port).source.id).toBe('portrait')
})
