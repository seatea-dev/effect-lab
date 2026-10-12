import { presets } from '../definitions/effects'
import { urbanSample } from '../definitions/samples'
import type { RenderRequest, WorkerMessage } from './protocol'

const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
const resultElement = document.querySelector<HTMLPreElement>('#result')!
const instanceId = 'preset-thumbnail-generation'
const source = { id: urbanSample.id, url: urbanSample.url }
let revision = 0
let requestId = 0
let ready = false
let rejectGeneration: (error: Error) => void
const generated: Record<string, string> = {}
let lastWorkerMessage = 'No message received.'

window.addEventListener('error', (event) => {
  resultElement.textContent = JSON.stringify({ error: `Page error: ${event.message}` })
})
window.addEventListener('unhandledrejection', (event) => {
  resultElement.textContent = JSON.stringify({ error: `Unhandled rejection: ${String(event.reason)}` })
})

const completion = new Promise<Record<string, string>>((resolve, reject) => {
  rejectGeneration = reject
  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data
    lastWorkerMessage = `Received ${message.type}.`
    if (message.type === 'ready' && message.instanceId === instanceId) {
      ready = true
      void renderNext(0, resolve)
    } else if (message.type === 'unsupported') {
      reject(new Error(message.message))
    } else if (message.type === 'error') {
      reject(new Error(message.message))
    } else if (message.type === 'export') {
      void readThumbnail(message.request, message.blob, resolve)
    }
  }
  worker.onerror = (event) => reject(new Error(`Production image worker failed: ${event.message || 'unknown worker error'}`))
})

async function renderNext(index: number, resolve: (value: Record<string, string>) => void): Promise<void> {
  if (!ready) return
  if (index === presets.length) {
    worker.terminate()
    resolve(generated)
    return
  }
  const preset = presets[index]!
  lastWorkerMessage = `Worker ready; rendering ${preset.id} from ${source.url}.`
  revision++
  worker.postMessage({ type: 'invalidate', instanceId, revision, source })
  const base = {
    type: 'render' as const, kind: 'export' as const, instanceId, requestId: ++requestId, revision,
  }
  let request: RenderRequest
  if (preset.effectId === 'ascii') request = { ...base, source, effectId: 'ascii', params: structuredClone(preset.params) }
  else if (preset.effectId === 'dither') request = { ...base, source, effectId: 'dither', params: structuredClone(preset.params) }
  else if (preset.effectId === 'pixelation') request = { ...base, source, effectId: 'pixelation', params: structuredClone(preset.params) }
  else if (preset.effectId === 'edge') request = { ...base, source, effectId: 'edge', params: structuredClone(preset.params) }
  else if (preset.effectId === 'halftone') request = { ...base, source, effectId: 'halftone', params: structuredClone(preset.params) }
  else request = { ...base, source, effectId: 'threshold', params: structuredClone(preset.params) }
  worker.postMessage(request)
}

async function readThumbnail(
  request: RenderRequest,
  blob: Blob,
  resolve: (value: Record<string, string>) => void,
): Promise<void> {
  const preset = presets.find(({ effectId, params }) => effectId === request.effectId
    && JSON.stringify(params) === JSON.stringify(request.params))
  if (!preset) throw new Error('A production render did not match a preset definition.')
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 288
    const context = canvas.getContext('2d')!
    context.fillStyle = '#f4f1e8'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const thumbnail = await new Promise<Blob>((done, reject) => canvas.toBlob((value) => value ? done(value) : reject(new Error('Could not encode thumbnail.')), 'image/jpeg', 0.84))
    const bytes = new Uint8Array(await thumbnail.arrayBuffer())
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    generated[preset.id] = btoa(binary)
  } finally {
    bitmap.close()
  }
  await renderNext(presets.findIndex(({ id }) => id === preset.id) + 1, resolve)
}

worker.postMessage({ type: 'hello', instanceId })
completion.then((output) => {
  resultElement.textContent = JSON.stringify(output)
}).catch((error: unknown) => {
  resultElement.textContent = JSON.stringify({ error: error instanceof Error ? error.message : 'Thumbnail generation failed.' })
  rejectGeneration(error instanceof Error ? error : new Error('Thumbnail generation failed.'))
})

window.setTimeout(() => rejectGeneration(new Error(`Timed out generating preset thumbnails. ${lastWorkerMessage}`)), 60_000)
