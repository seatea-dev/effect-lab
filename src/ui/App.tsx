import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Circle, Contrast, Layers2, LoaderCircle, RotateCcw, Upload, SlidersHorizontal, Square, TriangleAlert } from 'lucide-react'
import { effects, presets } from '../definitions/effects'
import { blueprintPalette, palettes } from '../definitions/palettes'
import type { PaletteId } from '../definitions/palettes'
import { samples } from '../definitions/samples'
import { isModified } from '../session/state'
import { useStudio } from './useStudio'

const dimensions = (size: { width: number; height: number }) => `${size.width.toLocaleString()} × ${size.height.toLocaleString()}`

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { session, render, displaySource, retainedUpload, send, upload, retry, exportPng } = useStudio(canvas)
  const sourceAnnouncementPending = useRef(true)
  const [imageStatus, setImageStatus] = useState('Loading image.')
  const selectedSourceId = session.pendingSourceId ?? session.sourceId
  const effect = effects[session.effectId]
  const thresholdParams = session.parametersByEffect.threshold
  const ditherParams = session.parametersByEffect.dither
  const pixelationParams = session.parametersByEffect.pixelation
  const edgeParams = session.parametersByEffect.edge
  const palette = session.effectId === 'dither' ? palettes[ditherParams.palette]
    : session.effectId === 'edge' ? { ink: edgeParams.invert ? blueprintPalette.paper : blueprintPalette.ink, paper: edgeParams.invert ? blueprintPalette.ink : blueprintPalette.paper }
      : palettes.ink
  const busy = render.phase === 'starting' || render.phase === 'updating'
  const unavailable = render.phase === 'starting' || render.phase === 'error'
  const modified = isModified(session)
  const selectedPreset = presets.find((preset) => preset.id === session.presetId)

  useEffect(() => {
    if (session.pendingSourceId) {
      sourceAnnouncementPending.current = true
      setImageStatus('Loading selected image.')
    } else if (session.sourceError) {
      sourceAnnouncementPending.current = false
      setImageStatus('')
    } else if (sourceAnnouncementPending.current && render.phase === 'ready' && render.sizes) {
      sourceAnnouncementPending.current = false
      setImageStatus(`${displaySource.name} loaded.`)
    }
  }, [displaySource.name, render.phase, render.sizes, session.pendingSourceId, session.sourceError])

  return (
    <div className="studio">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Imprint home"><span className="brand-mark"><Layers2 size={18} /></span>imprint<span className="brand-dot">.</span></a>
        <span className="topbar-caption">DIGITAL PRINT STUDIO</span>
        <div className="local-badge"><span />PROCESSED ON YOUR DEVICE</div>
      </header>

      <aside className="library panel" aria-label="Effects and presets">
        <div className="panel-heading"><span>THE TOOLBOX</span><span>01</span></div>
        <h2>Make an impression.</h2>
        <p className="intro">A little less detail.<br />A little more character.</p>
        <div className="section-heading"><h3>Effects</h3><span>{Object.keys(effects).length} AVAILABLE</span></div>
        <nav aria-label="Image effects">
          {Object.values(effects).map((entry) => (
            <button key={entry.id} className={`effect-button ${session.effectId === entry.id ? 'selected' : ''}`} aria-pressed={session.effectId === entry.id} onClick={() => send({ type: 'effect', id: entry.id })} disabled={unavailable}>
              <Contrast size={19} /><span><strong>{entry.name}</strong><small>{entry.id === 'dither' ? 'Tone into printed texture' : entry.id === 'pixelation' ? 'Simplify shape and color' : 'Light into graphic form'}</small></span><ArrowUpRight size={15} />
            </button>
          ))}
        </nav>
        <div className="section-heading preset-heading"><h3>Presets</h3><span>CURATED</span></div>
        <div className="preset-list">
          {presets.map((preset) => (
            <button key={preset.id} className={`preset-card ${session.presetId === preset.id ? 'selected' : ''}`} aria-pressed={session.presetId === preset.id} disabled={unavailable} onClick={() => send({ type: 'preset', id: preset.id })}>
              <span className={`ink-swatch ${preset.effectId === 'dither' ? 'vintage-swatch' : preset.effectId === 'pixelation' ? 'mosaic-swatch' : preset.effectId === 'edge' ? 'blueprint-swatch' : ''}`} aria-hidden="true"><span />{preset.effectId === 'dither' ? 'Dd' : preset.effectId === 'pixelation' ? 'Mx' : preset.effectId === 'edge' ? 'Bp' : 'Aa'}<span className="swatch-square" /></span>
              <span className="preset-caption"><strong>{preset.name}</strong><span>{session.presetId === preset.id && <Check size={13} />}{preset.effectId === 'pixelation' ? '27 COLORS' : 'TWO TONES'}</span></span>
            </button>
          ))}
        </div>
        <div className="library-note"><span className="small-cross">+</span><p>Start with a style.<br />Make it your own.</p></div>
        <div className="edition">EDITION 001<span>A STUDY IN CONTRAST</span></div>
      </aside>

      <main className="workspace" aria-label="Image workspace">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{imageStatus}</div>
        <div className="workspace-heading"><div><span className="eyebrow">YOUR CANVAS</span><h1 title={displaySource.name}>{displaySource.name}</h1></div><span className="sample-tag">{displaySource.subject.toUpperCase()}</span></div>
        <div className="preview-stage" aria-busy={busy}>
          <div className="registration registration-tl" /><div className="registration registration-tr" /><div className="registration registration-bl" /><div className="registration registration-br" />
          <canvas ref={canvas} className={`preview ${render.sizes ? 'visible' : ''}`} width={1200} height={720} aria-label={`${displaySource.name}, processed with ${effect.name}`} />
          {!render.sizes && <div className="preview-placeholder"><Contrast size={36} strokeWidth={1} /><p>{render.phase === 'error' ? 'Your canvas is waiting.' : 'Preparing your canvas.'}</p></div>}
          {busy && <div className="render-indicator"><LoaderCircle className="spin" size={14} />{render.phase === 'starting' ? 'Preparing image' : 'Updating preview'}</div>}
        </div>
        <div className="preview-meta"><span><span className="status-dot" />{busy ? 'UPDATING' : render.phase === 'error' ? 'PREVIEW PAUSED' : 'LIVE PREVIEW'}</span><span>{render.sizes ? dimensions(render.sizes.analysis) : '—'}<span className="meta-divider">/</span>FIT TO WORKSPACE</span></div>
        {session.sourceError && <div className="error-banner" role="alert"><TriangleAlert size={17} /><span>{session.sourceError} Your previous image and settings are retained.</span></div>}
        {render.error && <div className="error-banner" role="alert"><TriangleAlert size={17} /><span>{render.error}</span><button onClick={retry}>Retry</button></div>}
        <section className="source-section" aria-label="Source image">
          <div className="section-heading"><h2>Source image</h2><span>BUNDLED & READY TO EXPLORE</span></div>
          <div className="sample-gallery">
            {samples.map((sample) => <button key={sample.id} className={`sample-choice ${selectedSourceId === sample.id ? 'selected' : ''}`} aria-label={`${sample.subject}: ${sample.name}`} aria-pressed={selectedSourceId === sample.id} onClick={() => send({ type: 'source', id: sample.id })}>
              <img src={sample.thumbnailUrl} alt={sample.description} width={80} height={60} /><span>{sample.subject}</span>
            </button>)}
            {retainedUpload && <button className={`sample-choice ${selectedSourceId === retainedUpload.id ? 'selected' : ''}`} aria-label={`Your upload: ${retainedUpload.name}`} aria-pressed={selectedSourceId === retainedUpload.id} onClick={() => send({ type: 'source', id: retainedUpload.id })}>
              <img src={retainedUpload.thumbnailUrl} alt={retainedUpload.description} width={80} height={60} /><span>Your image</span>
            </button>}
            <button className="upload-choice" onClick={() => fileInput.current?.click()}><Upload size={19} /><span>Upload</span></button>
            <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload image" tabIndex={-1} onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) upload(file)
            }} />
          </div>
          <div className="source-details"><span>{displaySource.creator} · {displaySource.license}</span>{displaySource.sourceUrl && <a className="credit-link" href={displaySource.sourceUrl} target="_blank" rel="noreferrer">Image credit<ArrowUpRight size={13} /></a>}</div>
          <p className="upload-hint">JPEG, PNG or WebP · up to 20 MB · stays on your device</p>
        </section>
      </main>

      <aside className="controls panel" aria-label="Effect controls and export">
        <div className="panel-heading"><span>FINE TUNE</span><SlidersHorizontal size={14} /></div>
        <div className="active-effect"><div><span className="eyebrow">ACTIVE EFFECT</span><h2>{effect.name}</h2></div><Contrast size={24} strokeWidth={1.5} /></div>
        <p className="effect-description">{effect.description}</p>
        <div className="preset-status"><span>{selectedPreset ? `${selectedPreset.name.toUpperCase()} PRESET` : 'EFFECT SETTINGS'}</span>{modified && <span className="modified">Modified</span>}</div>
        <fieldset className="parameters" disabled={unavailable}><legend className="sr-only">{effect.name} parameters</legend>
          {session.effectId === 'edge' ? <>
            <div className="slider-label"><label htmlFor="sensitivity">Sensitivity</label><output htmlFor="sensitivity">{edgeParams.sensitivity}</output></div>
            <input id="sensitivity" type="range" min={effects.edge.controls.sensitivity.min} max={effects.edge.controls.sensitivity.max} step={effects.edge.controls.sensitivity.step} value={edgeParams.sensitivity} onChange={(event) => send({ type: 'edit', effectId: 'edge', params: { sensitivity: Number(event.target.value) } })} style={{ '--range-progress': `${edgeParams.sensitivity}%` } as React.CSSProperties} />
            <div className="range-caption"><span>STRONG EDGES</span><span>MORE DETAIL</span></div>
            <div className="toggle-row"><label htmlFor="edge-invert"><strong>Invert palette</strong><span>Exchange ink and paper</span></label><input id="edge-invert" className="toggle" type="checkbox" checked={edgeParams.invert} onChange={(event) => send({ type: 'edit', effectId: 'edge', params: { invert: event.target.checked } })} /></div>
          </> : session.effectId === 'threshold' ? <>
            <div className="slider-label"><label htmlFor="cutoff">Cutoff</label><output htmlFor="cutoff">{thresholdParams.cutoff}</output></div>
            <input id="cutoff" type="range" min={effects.threshold.controls.cutoff.min} max={effects.threshold.controls.cutoff.max} step={effects.threshold.controls.cutoff.step} value={thresholdParams.cutoff} onChange={(event) => send({ type: 'edit', effectId: 'threshold', params: { cutoff: Number(event.target.value) } })} style={{ '--range-progress': `${thresholdParams.cutoff / 255 * 100}%` } as React.CSSProperties} />
            <div className="range-caption"><span>MORE LIGHT</span><span>MORE INK</span></div>
            <div className="toggle-row"><label htmlFor="invert"><strong>Invert tones</strong><span>Exchange ink and paper</span></label><input id="invert" className="toggle" type="checkbox" checked={thresholdParams.invert} onChange={(event) => send({ type: 'edit', effectId: 'threshold', params: { invert: event.target.checked } })} /></div>
          </> : session.effectId === 'dither' ? <>
            <div className="slider-label"><label htmlFor="contrast">Contrast</label><output htmlFor="contrast">{ditherParams.contrast.toFixed(2)}</output></div>
            <input id="contrast" type="range" min={effects.dither.controls.contrast.min} max={effects.dither.controls.contrast.max} step={effects.dither.controls.contrast.step} value={ditherParams.contrast} onChange={(event) => send({ type: 'edit', effectId: 'dither', params: { contrast: Number(event.target.value) } })} style={{ '--range-progress': `${(ditherParams.contrast - 0.5) / 1.5 * 100}%` } as React.CSSProperties} />
            <div className="range-caption"><span>SOFTER</span><span>STRONGER</span></div>
            <div className="palette-select"><label htmlFor="palette">Palette</label><select id="palette" value={ditherParams.palette} onChange={(event) => send({ type: 'edit', effectId: 'dither', params: { palette: event.target.value as PaletteId } })}>{effects.dither.controls.palette.values.map((id) => <option key={id} value={id}>{palettes[id].name}</option>)}</select></div>
          </> : <>
            <div className="slider-label"><label htmlFor="block-size">Block size</label><output htmlFor="block-size">{pixelationParams.blockSize} units</output></div>
            <input id="block-size" type="range" min={effects.pixelation.controls.blockSize.min} max={effects.pixelation.controls.blockSize.max} step={effects.pixelation.controls.blockSize.step} value={pixelationParams.blockSize} onChange={(event) => send({ type: 'edit', effectId: 'pixelation', params: { blockSize: Number(event.target.value) } })} style={{ '--range-progress': `${(pixelationParams.blockSize - 4) / 60 * 100}%` } as React.CSSProperties} />
            <div className="range-caption"><span>SMALLER BLOCKS</span><span>LARGER BLOCKS</span></div>
            <div className="palette-select"><label htmlFor="color-count">Maximum colors</label><select id="color-count" value={pixelationParams.colorCount} onChange={(event) => send({ type: 'edit', effectId: 'pixelation', params: { colorCount: Number(event.target.value) as typeof pixelationParams.colorCount } })}>{effects.pixelation.controls.colorCount.values.map((count) => <option key={count} value={count}>{count} colors</option>)}</select></div>
          </>}
        </fieldset>
        {session.effectId !== 'pixelation' && <div className="palette-row"><span>PRINT PALETTE</span><div><span className="palette-chip paper" style={{ backgroundColor: `rgb(${palette.paper.join(',')})`, color: session.effectId === 'edge' ? `rgb(${palette.ink.join(',')})` : undefined }}><Circle size={10} />PAPER</span><span className="palette-chip ink" style={{ backgroundColor: `rgb(${palette.ink.join(',')})`, color: session.effectId === 'edge' ? `rgb(${palette.paper.join(',')})` : session.effectId === 'dither' && ditherParams.palette === 'terminal' ? '#101a13' : undefined }}><Square size={9} />INK</span></div></div>}
        <div className="reset-row"><button className="text-button" disabled={unavailable} onClick={() => send({ type: 'reset-effect' })}><RotateCcw size={12} />Reset effect</button><button className="text-button" disabled={unavailable || !session.presetId} onClick={() => send({ type: 'reset-preset' })}>Reset preset</button></div>
        <div className="export-section"><div className="section-heading"><h3>The finished print</h3><ArrowDownToLine size={15} /></div><dl><div><dt>Format</dt><dd>PNG</dd></div><div><dt>Source</dt><dd>{dimensions(render.sizes?.source ?? displaySource)}</dd></div><div><dt>Export</dt><dd>{render.sizes ? dimensions(render.sizes.export) : 'Preparing…'}</dd></div></dl>{render.sizes?.downscaled && <p className="downscale-notice">Export reduced to fit the 12-megapixel limit. Your image keeps its proportions.</p>}<button className="export-button" onClick={exportPng} disabled={!!session.pendingSourceId || render.phase !== 'ready' || render.exporting}>{render.exporting ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}{render.exporting ? 'Preparing PNG…' : 'Export PNG'}<span>↗</span></button><p className="export-caption">Your image. Your device. No cloud.</p><div className="export-notice" role="status">{render.notice}</div></div>
      </aside>

      <footer className="footer"><span>IMPRINT / AN EXERCISE IN SEEING DIFFERENTLY</span><span>MADE FOR THE CURIOUS</span></footer>
    </div>
  )
}
