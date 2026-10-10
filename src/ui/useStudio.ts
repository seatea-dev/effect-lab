import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { urbanSample } from '../definitions/samples'
import { createSession, sessionReducer } from '../session/state'
import type { Session, SessionAction } from '../session/state'
import { RenderController } from '../rendering/controller'
import { initialRenderState, renderStateReducer } from './renderState'
import type { RenderSnapshot, WorkerPort } from '../rendering/protocol'

function snapshot(session: Session): RenderSnapshot {
  return { revision: session.revision, source: { id: session.sourceId, url: urbanSample.url },
    effectId: session.effectId, params: session.parametersByEffect[session.effectId] }
}

export function useStudio(canvas: RefObject<HTMLCanvasElement | null>) {
  const current = useRef(createSession(urbanSample.id))
  const [session, setSession] = useState(current.current)
  const [render, dispatchRender] = useReducer(renderStateReducer, initialRenderState)
  const controller = useRef<RenderController | null>(null)
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const start = useCallback(() => {
    controller.current?.dispose()
    dispatchRender({ type: 'retry' })
    try {
      const worker = new Worker(new URL('../rendering/image.worker.ts', import.meta.url), { type: 'module' })
      const next = new RenderController(worker as WorkerPort, {
        onState: (value) => dispatchRender({ type: 'status', value }),
        onPreview: (bitmap) => {
          const target = canvas.current
          const context = target?.getContext('2d')
          if (!target || !context) throw new Error('The preview canvas is unavailable.')
          target.width = bitmap.width
          target.height = bitmap.height
          context.imageSmoothingEnabled = false
          context.drawImage(bitmap, 0, 0)
        },
        onExport: (blob, request) => {
          if (request.revision !== current.current.revision || blob.type !== 'image/png') throw new Error('This export is no longer current.')
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          const name = `sixth-avenue-${current.current.presetId ?? current.current.effectId}`.replace(/[^a-z0-9-]/gi, '-')
          link.download = `${name}.png`
          try {
            document.body.append(link)
            link.click()
          } catch (error) {
            URL.revokeObjectURL(url)
            throw error
          } finally {
            link.remove()
          }
          const timer = setTimeout(() => {
            URL.revokeObjectURL(url)
            downloads.current.delete(url)
          }, 1000)
          downloads.current.set(url, timer)
        },
      })
      controller.current = next
      next.update(snapshot(current.current))
    } catch {
      dispatchRender({ type: 'status', value: { phase: 'error', exporting: false, error: 'This browser could not start the image worker. Try a current desktop browser.' } })
    }
  }, [canvas])

  useEffect(() => {
    start()
    const urls = downloads.current
    return () => {
      controller.current?.dispose()
      controller.current = null
      for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url) }
      urls.clear()
    }
  }, [start])

  const send = (action: SessionAction) => {
    const next = sessionReducer(current.current, action)
    current.current = next
    setSession(next)
    // Invalidate synchronously with the action, before React's next paint/effect.
    controller.current?.update(snapshot(next))
  }

  return { session, render, send, retry: start, exportPng: () => controller.current?.exportPng() }
}
