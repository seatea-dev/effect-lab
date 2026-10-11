import { afterEach, expect, test, vi } from 'vitest'
import type { ClientMessage, WorkerMessage } from '../src/rendering/protocol'

const messages: WorkerMessage[] = []
let receive: ((event: MessageEvent<ClientMessage>) => void) | null = null

class Canvas {
  width: number
  height: number
  constructor(width: number, height: number) { this.width = width; this.height = height }
  getContext() {
    return {
      fillStyle: '', imageSmoothingEnabled: true,
      fillRect() {}, drawImage() {}, putImageData() {},
      getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    }
  }
  async convertToBlob() { return new Blob(['png'], { type: 'image/png' }) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  messages.length = 0
  receive = null
})

test('an unresolved obsolete sample fetch does not block the latest selection', async () => {
  const never = new Promise<Response>(() => {})
  const obsoleteSignals: AbortSignal[] = []
  let resolveLatestFetch: (() => void) | undefined
  const latestFetchStarted = new Promise<void>((resolve) => { resolveLatestFetch = resolve })
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('obsolete')) {
      obsoleteSignals.push(init?.signal as AbortSignal)
      return never
    }
    resolveLatestFetch?.()
    return Promise.resolve(new Response(new Blob(['image']), { status: 200 }))
  })
  const scope = {
    onmessage: null as ((event: MessageEvent<ClientMessage>) => void) | null,
    postMessage: (message: WorkerMessage) => messages.push(message),
  }
  vi.stubGlobal('self', scope)
  vi.stubGlobal('OffscreenCanvas', Canvas)
  vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
  vi.stubGlobal('createImageBitmap', async (source: Blob | OffscreenCanvas) => ({
    width: source instanceof Blob ? 1 : source.width,
    height: source instanceof Blob ? 130 : source.height,
    close() {},
  }))
  vi.stubGlobal('fetch', fetch)

  await import('../src/rendering/image.worker')
  receive = scope.onmessage
  receive!({ data: { type: 'hello', instanceId: 'test-worker' } } as MessageEvent<ClientMessage>)
  await vi.waitFor(() => expect(messages.some((message) => message.type === 'ready')).toBe(true))

  const obsolete = { revision: 1, source: { id: 'obsolete', url: '/obsolete.jpg' }, effectId: 'threshold' as const, params: { cutoff: 140, invert: false } }
  const latest = { revision: 2, source: { id: 'latest', url: '/latest.jpg' }, effectId: 'edge' as const, params: { sensitivity: 60, invert: false } }
  receive!({ data: { type: 'invalidate', instanceId: 'test-worker', revision: obsolete.revision, source: obsolete.source } } as MessageEvent<ClientMessage>)
  const obsoleteRequest = { ...obsolete, type: 'render' as const, instanceId: 'test-worker', requestId: 1, kind: 'preview' as const }
  receive!({ data: obsoleteRequest } as MessageEvent<ClientMessage>)
  await vi.waitFor(() => expect(fetch.mock.calls[0]?.[0]).toBe('/obsolete.jpg'))

  receive!({ data: { type: 'invalidate', instanceId: 'test-worker', revision: latest.revision, source: latest.source } } as MessageEvent<ClientMessage>)
  await vi.waitFor(() => expect(messages.some((message) => message.type === 'cancelled' && message.request.requestId === 1)).toBe(true))
  expect(obsoleteSignals[0].aborted).toBe(true)
  const latestRequest = { ...latest, type: 'render' as const, instanceId: 'test-worker', requestId: 2, kind: 'preview' as const }

  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis)
  let invalidateAtYield = true
  vi.stubGlobal('setTimeout', ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const wrapped = typeof handler === 'function' ? (...callbackArgs: unknown[]) => {
      if (invalidateAtYield) {
        invalidateAtYield = false
        receive!({ data: { type: 'invalidate', instanceId: 'test-worker', revision: 3, source: latest.source } } as MessageEvent<ClientMessage>)
      }
      handler(...callbackArgs)
    } : handler
    return nativeSetTimeout(wrapped, timeout, ...args)
  }) as typeof setTimeout)
  receive!({ data: latestRequest } as MessageEvent<ClientMessage>)
  await latestFetchStarted
  await vi.waitFor(() => expect(messages.some((message) => message.type === 'cancelled' && message.request.requestId === 2)).toBe(true))
  vi.stubGlobal('setTimeout', nativeSetTimeout)
  expect(fetch.mock.calls.map(([url]) => url)).toContain('/latest.jpg')
  expect(messages.some((message) => message.type === 'preview' && [1, 2].includes(message.request.requestId))).toBe(false)
})
