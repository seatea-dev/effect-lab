import { useRef } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Circle, Contrast, Layers2, LoaderCircle, RotateCcw, SlidersHorizontal, Square, TriangleAlert } from 'lucide-react'
import { effects, presets } from '../definitions/effects'
import { urbanSample } from '../definitions/samples'
import { isModified } from '../session/state'
import { useStudio } from './useStudio'

const dimensions = (size: { width: number; height: number }) => `${size.width.toLocaleString()} × ${size.height.toLocaleString()}`

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { session, render, send, retry, exportPng } = useStudio(canvas)
  const effect = effects[session.effectId]
  const params = session.parametersByEffect[session.effectId]
  const busy = render.phase === 'starting' || render.phase === 'updating'
  const unavailable = render.phase === 'starting' || render.phase === 'error'
  const modified = isModified(session)
  const selectedPreset = presets.find((preset) => preset.id === session.presetId)

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
        <div className="section-heading"><h3>Effects</h3><span>1 AVAILABLE</span></div>
        <nav aria-label="Image effects">
          <button className="effect-button" aria-pressed onClick={() => send({ type: 'effect', id: effect.id })} disabled={unavailable}>
            <Contrast size={19} /><span><strong>{effect.name}</strong><small>Light into graphic form</small></span><ArrowUpRight size={15} />
          </button>
        </nav>
        <div className="section-heading preset-heading"><h3>Presets</h3><span>CURATED</span></div>
        <div className="preset-list">
          {presets.map((preset) => (
            <button key={preset.id} className={`preset-card ${session.presetId === preset.id ? 'selected' : ''}`} aria-pressed={session.presetId === preset.id} disabled={unavailable} onClick={() => send({ type: 'preset', id: preset.id })}>
              <span className="ink-swatch" aria-hidden="true"><span />Aa<span className="swatch-square" /></span>
              <span className="preset-caption"><strong>{preset.name}</strong><span>{session.presetId === preset.id && <Check size={13} />} TWO TONES</span></span>
            </button>
          ))}
        </div>
        <div className="library-note"><span className="small-cross">+</span><p>Start with a style.<br />Make it your own.</p></div>
        <div className="edition">EDITION 001<span>A STUDY IN CONTRAST</span></div>
      </aside>

      <main className="workspace" aria-label="Image workspace">
        <div className="workspace-heading"><div><span className="eyebrow">YOUR CANVAS</span><h1>{urbanSample.name}</h1></div><span className="sample-tag">SAMPLE / 01</span></div>
        <div className="preview-stage" aria-busy={busy}>
          <div className="registration registration-tl" /><div className="registration registration-tr" /><div className="registration registration-bl" /><div className="registration registration-br" />
          <canvas ref={canvas} className={`preview ${render.sizes ? 'visible' : ''}`} width={1200} height={720} aria-label={`${urbanSample.name}, processed with ${effect.name}`} />
          {!render.sizes && <div className="preview-placeholder"><Contrast size={36} strokeWidth={1} /><p>{render.phase === 'error' ? 'Your canvas is waiting.' : 'Preparing your canvas.'}</p></div>}
          {busy && <div className="render-indicator"><LoaderCircle className="spin" size={14} />{render.phase === 'starting' ? 'Preparing image' : 'Updating preview'}</div>}
        </div>
        <div className="preview-meta"><span><span className="status-dot" />{busy ? 'UPDATING' : render.phase === 'error' ? 'PREVIEW PAUSED' : 'LIVE PREVIEW'}</span><span>{render.sizes ? dimensions(render.sizes.analysis) : '—'}<span className="meta-divider">/</span>FIT TO WORKSPACE</span></div>
        {render.error && <div className="error-banner" role="alert"><TriangleAlert size={17} /><span>{render.error}</span><button onClick={retry}>Retry</button></div>}
        <section className="source-section" aria-label="Source image">
          <div className="section-heading"><h2>Source image</h2><span>BUNDLED & READY TO EXPLORE</span></div>
          <div className="source-row"><div className="source-thumbnail"><img src={urbanSample.url} alt={urbanSample.description} /><span><Check size={12} /></span></div><div className="source-description"><strong>Sixth Avenue</strong><span>New York City · Jim Henderson</span><small>{dimensions(urbanSample)} · CC0</small></div><a className="credit-link" href={urbanSample.sourceUrl} target="_blank" rel="noreferrer">Image credit<ArrowUpRight size={13} /></a></div>
        </section>
      </main>

      <aside className="controls panel" aria-label="Effect controls and export">
        <div className="panel-heading"><span>FINE TUNE</span><SlidersHorizontal size={14} /></div>
        <div className="active-effect"><div><span className="eyebrow">ACTIVE EFFECT</span><h2>{effect.name}</h2></div><Contrast size={24} strokeWidth={1.5} /></div>
        <p className="effect-description">{effect.description}</p>
        <div className="preset-status"><span>{selectedPreset ? `${selectedPreset.name.toUpperCase()} PRESET` : 'EFFECT SETTINGS'}</span>{modified && <span className="modified">Modified</span>}</div>
        <fieldset className="parameters" disabled={unavailable}><legend className="sr-only">Threshold parameters</legend>
          <div className="slider-label"><label htmlFor="cutoff">Cutoff</label><output htmlFor="cutoff">{params.cutoff}</output></div>
          <input id="cutoff" type="range" min={effect.controls.cutoff.min} max={effect.controls.cutoff.max} step={effect.controls.cutoff.step} value={params.cutoff} onChange={(event) => send({ type: 'edit', params: { cutoff: Number(event.target.value) } })} style={{ '--range-progress': `${params.cutoff / 255 * 100}%` } as React.CSSProperties} />
          <div className="range-caption"><span>MORE LIGHT</span><span>MORE INK</span></div>
          <div className="toggle-row"><label htmlFor="invert"><strong>Invert tones</strong><span>Exchange ink and paper</span></label><input id="invert" className="toggle" type="checkbox" checked={params.invert} onChange={(event) => send({ type: 'edit', params: { invert: event.target.checked } })} /></div>
        </fieldset>
        <div className="palette-row"><span>PRINT PALETTE</span><div><span className="palette-chip paper"><Circle size={10} />PAPER</span><span className="palette-chip ink"><Square size={9} />INK</span></div></div>
        <div className="reset-row"><button className="text-button" disabled={unavailable} onClick={() => send({ type: 'reset-effect' })}><RotateCcw size={12} />Reset effect</button><button className="text-button" disabled={unavailable || !session.presetId} onClick={() => send({ type: 'reset-preset' })}>Reset preset</button></div>
        <div className="export-section"><div className="section-heading"><h3>The finished print</h3><ArrowDownToLine size={15} /></div><dl><div><dt>Format</dt><dd>PNG</dd></div><div><dt>Source</dt><dd>{dimensions(render.sizes?.source ?? urbanSample)}</dd></div><div><dt>Export</dt><dd>{render.sizes ? dimensions(render.sizes.export) : 'Preparing…'}</dd></div></dl>{render.sizes?.downscaled && <p className="downscale-notice">Export reduced to fit the 12-megapixel limit. Your image keeps its proportions.</p>}<button className="export-button" onClick={exportPng} disabled={render.phase !== 'ready' || render.exporting}>{render.exporting ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}{render.exporting ? 'Preparing PNG…' : 'Export PNG'}<span>↗</span></button><p className="export-caption">Your image. Your device. No cloud.</p><div className="export-notice" role="status">{render.notice}</div></div>
      </aside>

      <footer className="footer"><span>IMPRINT / AN EXERCISE IN SEEING DIFFERENTLY</span><span>MADE FOR THE CURIOUS</span></footer>
    </div>
  )
}
