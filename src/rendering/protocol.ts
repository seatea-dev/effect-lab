import type { EffectId, ThresholdParams } from '../effects/types'
import type { ImageSizes } from './sizing'

export type RenderSnapshot = {
  revision: number
  source: { id: string; url: string }
  effectId: EffectId
  params: ThresholdParams
}
export type RenderRequest = RenderSnapshot & { type: 'render'; instanceId: string; requestId: number; kind: 'preview' | 'export' }
export type ClientMessage = RenderRequest | { type: 'hello'; instanceId: string } | { type: 'invalidate'; instanceId: string; revision: number; source: RenderSnapshot['source'] }
export type WorkerMessage =
  | { type: 'ready'; instanceId: string }
  | { type: 'unsupported'; instanceId: string; message: string }
  | { type: 'preview'; request: RenderRequest; bitmap: ImageBitmap; sizes: ImageSizes; elapsedMs: number }
  | { type: 'export'; request: RenderRequest; blob: Blob }
  | { type: 'cancelled'; request: RenderRequest }
  | { type: 'error'; request: RenderRequest; message: string }

export interface WorkerPort {
  onmessage: ((event: { data: WorkerMessage }) => void) | null
  onerror: ((event: { message: string; preventDefault?: () => void }) => void) | null
  postMessage(message: ClientMessage): void
  terminate(): void
}
