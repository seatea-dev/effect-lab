import { effects } from '../definitions/effects'
import { PAPER_CSS } from '../definitions/palettes'
import { imageSizes } from './sizing'
import type { ImageSizes } from './sizing'
import type { ClientMessage, RenderRequest, RenderSnapshot, WorkerMessage } from './protocol'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ClientMessage>) => void) | null
  postMessage: (message: WorkerMessage, transfer?: Transferable[]) => void
}
let instanceId = ''
let latestRevision = 0
let desiredSource: RenderSnapshot['source'] | undefined
let prepared: { source: RenderSnapshot['source']; sizes: ImageSizes; pixels: Uint8ClampedArray } | undefined
let processed: { key: string; canvas: OffscreenCanvas } | undefined
let running = false
const yieldToMessages = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const isCurrent = (request: RenderRequest) => request.instanceId === instanceId && request.revision === latestRevision
const sameSource = (a: RenderSnapshot['source'], b?: RenderSnapshot['source']) => a.id === b?.id && a.url === b.url

function canvas(width: number, height: number) {
  const output = new OffscreenCanvas(width, height)
  const context = output.getContext('2d', { colorSpace: 'srgb' })
  if (!context) throw new Error('This browser cannot create the image canvas.')
  return { output, context }
}

async function prepare(request: RenderRequest) {
  if (prepared && sameSource(prepared.source, request.source)) return prepared
  const response = await fetch(request.source.url)
  if (!response.ok) throw new Error('The sample image could not be loaded.')
  const blob = await response.blob()
  if (!sameSource(request.source, desiredSource)) return undefined
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  try {
    if (!sameSource(request.source, desiredSource)) return undefined
    const sizes = imageSizes(bitmap.width, bitmap.height)
    const { output, context } = canvas(sizes.analysis.width, sizes.analysis.height)
    context.fillStyle = PAPER_CSS
    context.fillRect(0, 0, output.width, output.height)
    context.drawImage(bitmap, 0, 0, output.width, output.height)
    const pixels = context.getImageData(0, 0, output.width, output.height).data
    prepared = { source: request.source, sizes, pixels }
    processed = undefined
    return prepared
  } finally {
    bitmap.close()
  }
}

async function process(request: RenderRequest) {
  const started = performance.now()
  try {
    if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
    const image = await prepare(request)
    if (!image || !isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
    const key = JSON.stringify([request.source, request.effectId, request.params])
    if (processed?.key !== key) {
      const { width, height } = image.sizes.analysis
      const pixels = new Uint8ClampedArray(image.pixels.length)
      // Coarse row batches keep cancellation responsive without a scheduler framework.
      for (let row = 0; row < height; row += 64) {
        const start = row * width * 4
        const end = Math.min(height, row + 64) * width * 4
        pixels.set(effects[request.effectId].process(image.pixels.subarray(start, end), request.params), start)
        await yieldToMessages()
        if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
      }
      const { output, context } = canvas(width, height)
      context.putImageData(new ImageData(pixels, width, height), 0, 0)
      processed = { key, canvas: output }
    }
    if (request.kind === 'preview') {
      const bitmap = await createImageBitmap(processed.canvas)
      if (!isCurrent(request)) { bitmap.close(); scope.postMessage({ type: 'cancelled', request }); return }
      scope.postMessage({ type: 'preview', request, sizes: image.sizes, bitmap, elapsedMs: performance.now() - started }, [bitmap])
    } else {
      const { width, height } = image.sizes.export
      const { output, context } = canvas(width, height)
      context.imageSmoothingEnabled = false
      context.drawImage(processed.canvas, 0, 0, width, height)
      await yieldToMessages()
      if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
      const blob = await output.convertToBlob({ type: 'image/png' })
      if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
      if (!blob.size || blob.type !== 'image/png') throw new Error('PNG encoding did not succeed.')
      scope.postMessage({ type: 'export', request, blob })
    }
  } catch (error) {
    scope.postMessage(isCurrent(request)
      ? { type: 'error', request, message: error instanceof Error ? error.message : 'Image processing failed.' }
      : { type: 'cancelled', request })
  } finally {
    running = false
  }
}

scope.onmessage = ({ data }) => {
  if (data.type === 'hello') {
    instanceId = data.instanceId
    void (async () => {
      try {
        if (typeof createImageBitmap !== 'function') throw new Error('Bitmap decoding is unavailable.')
        const { output } = canvas(1, 1)
        const png = await output.convertToBlob({ type: 'image/png' })
        if (!png.size) throw new Error('PNG export is unavailable.')
        scope.postMessage({ type: 'ready', instanceId })
      } catch {
        scope.postMessage({ type: 'unsupported', instanceId, message: 'This browser does not support the image worker. Try a current desktop browser.' })
      }
    })()
  } else if (data.instanceId === instanceId && data.type === 'invalidate') {
    if (data.revision >= latestRevision) {
      latestRevision = data.revision
      desiredSource = data.source
    }
  } else if (data.type === 'render' && data.instanceId === instanceId) {
    if (running) { scope.postMessage({ type: 'error', request: data, message: 'Another image request is still running.' }); return }
    running = true
    void process(data)
  }
}
