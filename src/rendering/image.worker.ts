import { effects } from '../definitions/effects'
import { drawPixelation } from '../effects/pixelation'
import type { PixelationPlan } from '../effects/pixelation'
import { PAPER_CSS } from '../definitions/palettes'
import { validateUpload } from './upload'
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
let prepared: { source: RenderSnapshot['source']; sizes: ImageSizes; pixels: Uint8ClampedArray; thumbnail?: Blob } | undefined
let processed: { key: string; canvas: OffscreenCanvas } | { key: string; pixelation: PixelationPlan } | undefined
let running = false
let activeAbortController: AbortController | undefined
const yieldToMessages = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const isCurrent = (request: RenderRequest) => request.instanceId === instanceId && request.revision === latestRevision
const sameSource = (a: RenderSnapshot['source'], b?: RenderSnapshot['source']) => a.id === b?.id && a.url === b.url

function waitFor<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Image preparation was cancelled.', 'AbortError')); return }
    const cleanup = () => signal.removeEventListener('abort', cancel)
    const cancel = () => { cleanup(); reject(new DOMException('Image preparation was cancelled.', 'AbortError')) }
    signal.addEventListener('abort', cancel, { once: true })
    promise.then((value) => { cleanup(); resolve(value) }, (error: unknown) => { cleanup(); reject(error) })
  })
}

function canvas(width: number, height: number) {
  const output = new OffscreenCanvas(width, height)
  const context = output.getContext('2d', { colorSpace: 'srgb' })
  if (!context) throw new Error('This browser cannot create the image canvas.')
  return { output, context }
}

async function prepare(request: RenderRequest, signal: AbortSignal) {
  if (prepared && sameSource(prepared.source, request.source)) return prepared
  const response = await waitFor(fetch(request.source.url, { signal }), signal)
  if (!response.ok) throw new Error('The image could not be loaded. Please try again.')
  const blob = await waitFor(response.blob(), signal)
  if (!sameSource(request.source, desiredSource)) return undefined
  if (request.source.upload) await validateUpload(blob)
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
    let thumbnail: Blob | undefined
    if (request.source.upload) {
      const scale = Math.min(1, 160 / Math.max(output.width, output.height))
      const small = canvas(Math.max(1, Math.floor(output.width * scale)), Math.max(1, Math.floor(output.height * scale)))
      small.context.drawImage(output, 0, 0, small.output.width, small.output.height)
      thumbnail = await small.output.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
      if (!sameSource(request.source, desiredSource)) return undefined
    }
    prepared = { source: request.source, sizes, pixels, thumbnail }
    processed = undefined
    return prepared
  } finally {
    bitmap.close()
  }
}

async function process(request: RenderRequest, abortController: AbortController) {
  const started = performance.now()
  let preparing = true
  try {
    if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
    const image = await prepare(request, abortController.signal)
    preparing = false
    if (!image || !isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
    const key = JSON.stringify([request.source, request.effectId, request.params])
    if (processed?.key !== key) {
      const { width, height } = image.sizes.analysis
      if (request.effectId === 'pixelation') {
        const job = effects.pixelation.process(image.pixels, width, height, image.sizes.source.width, image.sizes.source.height, request.params)
        let result = job.next()
        while (!result.done) {
          await yieldToMessages()
          if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
          result = job.next()
        }
        processed = { key, pixelation: result.value }
      } else {
        let pixels: Uint8ClampedArray<ArrayBuffer>
        if (request.effectId === 'dither') {
          const job = effects.dither.process(image.pixels, width, request.params)
          let result = job.next()
          while (!result.done) {
            await yieldToMessages()
            if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
            result = job.next()
          }
          pixels = result.value
        } else {
          pixels = new Uint8ClampedArray(image.pixels.length)
          for (let row = 0; row < height; row += 64) {
            const start = row * width * 4
            const end = Math.min(height, row + 64) * width * 4
            pixels.set(effects.threshold.process(image.pixels.subarray(start, end), request.params), start)
            await yieldToMessages()
            if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
          }
        }
        const { output, context } = canvas(width, height)
        context.putImageData(new ImageData(pixels, width, height), 0, 0)
        processed = { key, canvas: output }
      }
    }
    if (request.kind === 'preview') {
      let bitmap: ImageBitmap
      if ('pixelation' in processed) {
        const { width, height } = image.sizes.analysis
        const { output, context } = canvas(width, height)
        const job = drawPixelation(processed.pixelation, context, width, height)
        let result = job.next()
        while (!result.done) {
          await yieldToMessages()
          if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
          result = job.next()
        }
        bitmap = await createImageBitmap(output)
      } else {
        bitmap = await createImageBitmap(processed.canvas)
      }
      if (!isCurrent(request)) { bitmap.close(); scope.postMessage({ type: 'cancelled', request }); return }
      scope.postMessage({ type: 'preview', request, sizes: image.sizes, bitmap, thumbnail: image.thumbnail, elapsedMs: performance.now() - started }, [bitmap])
    } else {
      const { width, height } = image.sizes.export
      const { output, context } = canvas(width, height)
      if ('pixelation' in processed) {
        const job = drawPixelation(processed.pixelation, context, width, height)
        let result = job.next()
        while (!result.done) {
          await yieldToMessages()
          if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
          result = job.next()
        }
      } else {
        context.imageSmoothingEnabled = false
        context.drawImage(processed.canvas, 0, 0, width, height)
        await yieldToMessages()
        if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
      }
      const blob = await output.convertToBlob({ type: 'image/png' })
      if (!isCurrent(request)) { scope.postMessage({ type: 'cancelled', request }); return }
      if (!blob.size || blob.type !== 'image/png') throw new Error('PNG encoding did not succeed.')
      scope.postMessage({ type: 'export', request, blob })
    }
  } catch (error) {
    scope.postMessage(isCurrent(request)
      ? { type: 'error', request, stage: preparing ? 'source' : undefined, message: preparing
        ? `The image could not be prepared. ${error instanceof Error ? error.message : 'Try another image.'}`
        : error instanceof Error ? error.message : 'Image processing failed.' }
      : { type: 'cancelled', request })
  } finally {
    if (activeAbortController === abortController) activeAbortController = undefined
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
      if (data.revision > latestRevision) activeAbortController?.abort()
      latestRevision = data.revision
      desiredSource = data.source
    }
  } else if (data.type === 'render' && data.instanceId === instanceId) {
    if (running) { scope.postMessage({ type: 'error', request: data, message: 'Another image request is still running.' }); return }
    running = true
    activeAbortController = new AbortController()
    void process(data, activeAbortController)
  }
}
