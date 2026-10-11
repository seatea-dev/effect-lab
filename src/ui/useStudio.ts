import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { getSample, urbanSample } from '../definitions/samples'
import type { SampleDefinition } from '../definitions/samples'
import { createSession, sessionReducer } from '../session/state'
import type { Session, SessionAction } from '../session/state'
import { RenderController } from '../rendering/controller'
import { UPLOAD_BYTE_LIMIT } from '../rendering/upload'
import { initialRenderState, renderStateReducer } from './renderState'
import type { RenderSnapshot, WorkerPort } from '../rendering/protocol'

// Browser resources stay outside reducer state. Only one accepted upload and one candidate exist.
type Upload = SampleDefinition & { file: File }

function snapshot(session: Session, uploads: Map<string, Upload>): RenderSnapshot {
  const id = session.pendingSourceId ?? session.sourceId
  const upload = uploads.get(id)
  const source = upload ? { id, url: upload.url, upload: true } : { id, url: getSample(id).url }
  if (session.effectId === 'ascii') return { revision: session.revision, source, effectId: 'ascii', params: session.parametersByEffect.ascii }
  if (session.effectId === 'dither') return { revision: session.revision, source, effectId: 'dither', params: session.parametersByEffect.dither }
  if (session.effectId === 'pixelation') return { revision: session.revision, source, effectId: 'pixelation', params: session.parametersByEffect.pixelation }
  if (session.effectId === 'edge') return { revision: session.revision, source, effectId: 'edge', params: session.parametersByEffect.edge }
  if (session.effectId === 'halftone') return { revision: session.revision, source, effectId: 'halftone', params: session.parametersByEffect.halftone }
  return { revision: session.revision, source, effectId: 'threshold', params: session.parametersByEffect.threshold }
}

function releaseUpload(upload: Upload) {
  URL.revokeObjectURL(upload.url)
  if (upload.thumbnailUrl) URL.revokeObjectURL(upload.thumbnailUrl)
}

export function useStudio(canvas: RefObject<HTMLCanvasElement | null>) {
  const current = useRef(createSession(urbanSample.id))
  const [session, setSession] = useState(current.current)
  const [displaySource, setDisplaySource] = useState<SampleDefinition>(urbanSample)
  const [render, dispatchRender] = useReducer(renderStateReducer, initialRenderState)
  const controller = useRef<RenderController | null>(null)
  const uploads = useRef(new Map<string, Upload>())
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const failSource = useCallback((id: string, message: string) => {
    const state = current.current
    if (state.pendingSourceId !== id) return false
    const next = sessionReducer(state, { type: 'source-failed', id, intent: state.sourceIntent, message })
    const candidate = uploads.current.get(id)
    if (candidate && state.retainedUploadId !== id) { releaseUpload(candidate); uploads.current.delete(id) }
    current.current = next
    setSession(next)
    controller.current?.update(snapshot(next, uploads.current))
    return true
  }, [])

  const start = useCallback(() => {
    controller.current?.dispose()
    dispatchRender({ type: 'retry' })
    try {
      const worker = new Worker(new URL('../rendering/image.worker.ts', import.meta.url), { type: 'module' })
      const next = new RenderController(worker as WorkerPort, {
        onState: (value) => dispatchRender({ type: 'status', value }),
        onSourceError: (request, message) => failSource(request.source.id, message),
        onPreview: (bitmap, request, sizes, thumbnail) => {
          const target = canvas.current
          const context = target?.getContext('2d')
          if (!target || !context) throw new Error('The preview canvas is unavailable.')
          const upload = uploads.current.get(request.source.id)
          if (upload && !upload.thumbnailUrl && thumbnail) upload.thumbnailUrl = URL.createObjectURL(thumbnail)
          target.width = bitmap.width
          target.height = bitmap.height
          context.imageSmoothingEnabled = false
          context.drawImage(bitmap, 0, 0)
          const descriptor = upload ?? getSample(request.source.id)
          setDisplaySource({ ...descriptor, ...sizes.source })
          const state = current.current
          if (state.pendingSourceId === request.source.id) {
            const accepted = sessionReducer(state, { type: 'source-ready', id: request.source.id, intent: state.sourceIntent, upload: !!upload })
            if (upload && state.retainedUploadId && state.retainedUploadId !== upload.id) {
              const old = uploads.current.get(state.retainedUploadId)
              if (old) { releaseUpload(old); uploads.current.delete(old.id) }
            }
            current.current = accepted
            setSession(accepted)
          }
        },
        onExport: (blob, request) => {
          if (request.revision !== current.current.revision || current.current.pendingSourceId || blob.type !== 'image/png') throw new Error('This export is no longer current.')
          const source = uploads.current.get(request.source.id) ?? getSample(request.source.id)
          const basename = source.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-').slice(0, 80) || 'image'
          const name = `${basename}-${current.current.presetId ?? current.current.effectId}`
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${name}.png`
          try { document.body.append(link); link.click() }
          catch (error) { URL.revokeObjectURL(url); throw error }
          finally { link.remove() }
          const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url) }, 1000)
          downloads.current.set(url, timer)
        },
      })
      controller.current = next
      next.update(snapshot(current.current, uploads.current))
    } catch {
      dispatchRender({ type: 'status', value: { phase: 'error', exporting: false, error: 'This browser could not start the image worker. Try a current desktop browser.' } })
    }
  }, [canvas, failSource])

  useEffect(() => {
    start()
    const urls = downloads.current
    const files = uploads.current
    return () => {
      controller.current?.dispose()
      controller.current = null
      for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url) }
      urls.clear()
      for (const upload of files.values()) releaseUpload(upload)
      files.clear()
    }
  }, [start])

  const send = (action: SessionAction) => {
    const state = current.current
    const next = sessionReducer(state, action)
    if (action.type === 'source' && state.pendingSourceId && state.pendingSourceId !== state.retainedUploadId && state.pendingSourceId !== action.id) {
      const obsolete = uploads.current.get(state.pendingSourceId)
      // Revocation prevents new fetches; an already fetched Blob remains valid in the worker.
      if (obsolete) { releaseUpload(obsolete); uploads.current.delete(obsolete.id) }
    }
    current.current = next
    setSession(next)
    controller.current?.update(snapshot(next, uploads.current))
  }

  const upload = (file: File) => {
    const id = `upload-${crypto.randomUUID()}`
    uploads.current.set(id, {
      id, file, name: file.name || 'Your image', subject: 'Upload', description: `${file.name || 'Your upload'}, still image`,
      url: URL.createObjectURL(file), thumbnailUrl: '', width: 0, height: 0,
      creator: 'Your image', sourceUrl: '', license: 'Still image · this visit only', licenseUrl: '',
    })
    send({ type: 'source', id })
    if (file.size > UPLOAD_BYTE_LIMIT) failSource(id, 'Choose an image no larger than 20 MB.')
  }

  return { session, render, displaySource, retainedUpload: session.retainedUploadId ? uploads.current.get(session.retainedUploadId) : undefined,
    send, upload, retry: start, exportPng: () => !current.current.pendingSourceId && controller.current?.exportPng() }
}
