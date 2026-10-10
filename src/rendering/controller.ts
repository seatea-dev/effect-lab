import type { RenderRequest, RenderSnapshot, WorkerMessage, WorkerPort } from './protocol'
import type { ImageSizes } from './sizing'

export type RenderState = {
  phase: 'starting' | 'updating' | 'ready' | 'error'
  exporting: boolean
  sizes?: ImageSizes
  elapsedMs?: number
  error?: string
  notice?: string
}
type Callbacks = {
  onState: (state: RenderState) => void
  onPreview: (bitmap: ImageBitmap, request: RenderRequest, sizes: ImageSizes) => void
  onExport: (blob: Blob, request: RenderRequest) => void
}
type Schedule = (callback: () => void) => () => void
const nextFrame: Schedule = (callback) => {
  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}

/** Owns one running request and one replaceable pending preview. */
export class RenderController {
  private readonly instanceId = crypto.randomUUID()
  private requestId = 0
  private current?: RenderSnapshot
  private active?: RenderRequest
  private pending?: RenderSnapshot
  private ready = false
  private disposed = false
  private cancelFrame?: () => void
  private acceptedRevision = 0
  private state: RenderState = { phase: 'starting', exporting: false }

  constructor(private port: WorkerPort, private callbacks: Callbacks, private schedule: Schedule = nextFrame) {
    port.onmessage = ({ data }) => this.receive(data)
    port.onerror = (event) => {
      event.preventDefault?.()
      if (this.disposed) return
      this.ready = false
      this.active = undefined
      this.pending = undefined
      this.emit({ phase: 'error', exporting: false, error: 'The image worker stopped. Retry to restart it.' })
    }
    port.postMessage({ type: 'hello', instanceId: this.instanceId })
  }

  update(snapshot: RenderSnapshot): void {
    if (this.disposed) return
    this.current = { ...snapshot, params: { ...snapshot.params }, source: { ...snapshot.source } }
    this.pending = this.current
    this.port.postMessage({ type: 'invalidate', instanceId: this.instanceId, revision: snapshot.revision, source: snapshot.source })
    this.emit({ phase: this.ready ? 'updating' : 'starting', exporting: false, error: undefined,
      notice: this.active?.kind === 'export' ? 'Export cancelled because the settings changed.' : undefined })
    this.schedulePreview()
  }

  exportPng(): boolean {
    if (this.disposed || !this.ready || !this.current || this.active || this.pending
      || this.state.phase !== 'ready' || this.acceptedRevision !== this.current.revision) return false
    this.active = { ...this.current, type: 'render', kind: 'export', instanceId: this.instanceId, requestId: ++this.requestId }
    this.emit({ exporting: true, error: undefined, notice: undefined })
    this.port.postMessage(this.active)
    return true
  }

  dispose(): void {
    this.disposed = true
    this.cancelFrame?.()
    this.pending = undefined
    this.port.onmessage = null
    this.port.onerror = null
    this.port.terminate()
  }

  private emit(patch: Partial<RenderState>): void {
    this.state = { ...this.state, ...patch }
    this.callbacks.onState({ ...this.state })
  }

  private schedulePreview(): void {
    if (this.disposed || !this.ready || this.cancelFrame || this.active || !this.pending) return
    this.cancelFrame = this.schedule(() => {
      this.cancelFrame = undefined
      if (this.disposed || this.active || !this.pending) return
      const snapshot = this.pending
      this.pending = undefined
      this.active = { ...snapshot, type: 'render', kind: 'preview', instanceId: this.instanceId, requestId: ++this.requestId }
      this.port.postMessage(this.active)
    })
  }

  private isCurrent(request: RenderRequest): boolean {
    return !this.disposed && request.instanceId === this.instanceId && request.revision === this.current?.revision
      && request.source.id === this.current.source.id && request.effectId === this.current.effectId
  }

  private receive(message: WorkerMessage): void {
    if (message.type === 'ready') {
      if (!this.disposed && message.instanceId === this.instanceId) {
        this.ready = true
        this.schedulePreview()
      }
      return
    }
    if (message.type === 'unsupported') {
      if (!this.disposed && message.instanceId === this.instanceId) this.emit({ phase: 'error', error: message.message })
      return
    }
    const { request } = message
    if (request.instanceId !== this.instanceId || request.requestId !== this.active?.requestId || this.disposed) {
      if (message.type === 'preview') message.bitmap.close()
      return
    }
    this.active = undefined
    if (this.isCurrent(request)) {
      if (message.type === 'preview') {
        try {
          this.callbacks.onPreview(message.bitmap, request, message.sizes)
          this.acceptedRevision = request.revision
          this.emit({ phase: 'ready', sizes: message.sizes, elapsedMs: message.elapsedMs, error: undefined })
        } catch {
          this.emit({ phase: 'error', exporting: false, error: 'The preview could not be displayed. Please retry.' })
        } finally { message.bitmap.close() }
      } else if (message.type === 'error') {
        this.emit(request.kind === 'export'
          ? { exporting: false, notice: `Export failed. ${message.message} You can try again.` }
          : { phase: 'error', exporting: false, error: message.message })
      } else if (message.type === 'export') {
        try {
          this.callbacks.onExport(message.blob, request)
          this.emit({ exporting: false, notice: 'PNG downloaded.' })
        } catch {
          this.emit({ exporting: false, notice: 'The download failed. Please try again.' })
        }
      }
    } else if (message.type === 'preview') message.bitmap.close()
    this.schedulePreview()
  }
}
