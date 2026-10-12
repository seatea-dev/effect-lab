import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { preview } from 'vite'

const root = process.cwd()
const chrome = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = Number(process.env.GALLERY_PREVIEW_PORT ?? 4189)
const debugPort = Number(process.env.GALLERY_CHROME_DEBUG_PORT ?? 9429)
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'effect-lab-gallery-test-'))
const downloads = await fs.mkdtemp(path.join(os.tmpdir(), 'effect-lab-gallery-downloads-'))
const server = await preview({
  configFile: path.join(root, 'vite.config.ts'),
  preview: { host: '127.0.0.1', port, strictPort: true },
})
const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${debugPort}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })
let socket

try {
  const endpoint = `http://127.0.0.1:${debugPort}`
  let target
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      target = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json())
      break
    } catch { await delay(100) }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Headless Chrome did not expose its DevTools endpoint.')

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const pending = new Map()
  let nextId = 0
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result?.value
  }
  const waitFor = async (expression, label) => {
    for (let attempt = 0; attempt < 240; attempt++) {
      if (await evaluate(expression)) return
      await delay(250)
    }
    throw new Error(`Timed out waiting for ${label}.`)
  }
  const pointerClick = async (expression, label) => {
    const point = await evaluate(`(() => {
      const element = ${expression};
      if (!element) throw new Error("Missing ${label}.");
      element.scrollIntoView({ block: "center", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`)
    if (!point || point.y < 0 || point.y > (await evaluate('innerHeight'))) throw new Error(`${label} is outside the viewport after scrolling.`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  }
  const presets = ['Terminal', 'Vintage Dither', 'Ink', 'Mosaic', 'Blueprint', 'Newsprint']
  const viewports = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1100, height: 800 }]
  let selectedSource = 'Sixth Avenue at dusk'

  await Promise.all([send('Runtime.enable'), send('Page.enable'), send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })])
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/effect-lab/` })
  await waitFor('document.querySelectorAll(".preset-card").length === 6 && !document.querySelector(".export-button")?.disabled', 'initial preview and preset gallery')

  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false })
    const dimensions = await evaluate('(() => { const list = document.querySelector(".preset-list"); return { clientHeight: list.clientHeight, scrollHeight: list.scrollHeight }; })()')
    if (dimensions.clientHeight === 0) throw new Error(`Preset gallery collapsed to zero height at ${viewport.width}×${viewport.height} (scrollHeight ${dimensions.scrollHeight}).`)
    if (dimensions.scrollHeight <= dimensions.clientHeight) throw new Error(`Expected a scrollable preset gallery at ${viewport.width}×${viewport.height}.`)

    for (const name of presets) {
      await pointerClick(`document.querySelector('.preset-card[aria-label="Apply ${name} preset"]')`, `${name} preset`)
      await waitFor(`document.querySelector('.preset-card[aria-label="Apply ${name} preset"]')?.getAttribute('aria-pressed') === 'true' && !document.querySelector('.export-button')?.disabled`, `${name} selection at ${viewport.width}×${viewport.height}`)
      const source = await evaluate('document.querySelector(".workspace-heading h1")?.textContent')
      if (source !== selectedSource) throw new Error(`${name} changed the selected source at ${viewport.width}×${viewport.height}.`)
    }

    if (viewport.width === 1280) {
      await pointerClick('Array.from(document.querySelectorAll(".preset-card")).find(card => card.getAttribute("aria-label") === "Apply Terminal preset")', 'Terminal before reset checks')
      await waitFor('Array.from(document.querySelectorAll(".preset-card")).find(card => card.getAttribute("aria-label") === "Apply Terminal preset")?.getAttribute("aria-pressed") === "true" && !document.querySelector(".export-button")?.disabled', 'Terminal before reset checks')
      await pointerClick('document.querySelector("#character-height")', 'Terminal character-height control')
      await waitFor('document.querySelector(".modified")?.textContent === "Modified"', 'Modified state')
      await pointerClick('document.querySelector(".reset-row button:nth-child(2)")', 'Reset Preset')
      await waitFor('document.querySelector("output[for=character-height]")?.textContent === "20 units" && !document.querySelector(".modified")', 'Reset Preset')
      await pointerClick('document.querySelector("#character-height")', 'Terminal character-height control after reset')
      await waitFor('document.querySelector(".modified")?.textContent === "Modified"', 'Modified state before Reset Effect')
      await pointerClick('document.querySelector(".reset-row button:first-child")', 'Reset Effect')
      await waitFor('document.querySelector("output[for=character-height]")?.textContent === "24 units" && document.querySelector(".preset-status")?.textContent.includes("EFFECT SETTINGS")', 'Reset Effect')
      await pointerClick('Array.from(document.querySelectorAll(".preset-card")).find(card => card.getAttribute("aria-label") === "Apply Terminal preset")', 'Terminal after Reset Effect')
      await waitFor('Array.from(document.querySelectorAll(".preset-card")).find(card => card.getAttribute("aria-label") === "Apply Terminal preset")?.getAttribute("aria-pressed") === "true" && !document.querySelector(".export-button")?.disabled', 'Terminal reapplication')
      await pointerClick('Array.from(document.querySelectorAll(".sample-choice")).find(button => button.getAttribute("aria-label").startsWith("Nature:"))', 'Nature source')
      await waitFor('document.querySelector(".workspace-heading h1")?.textContent === "The Tetons and the Snake River" && Array.from(document.querySelectorAll(".preset-card")).find(card => card.getAttribute("aria-label") === "Apply Terminal preset")?.getAttribute("aria-pressed") === "true" && !document.querySelector(".export-button")?.disabled', 'source preservation after gallery selection')
      selectedSource = 'The Tetons and the Snake River'
      await pointerClick('document.querySelector(".export-button")', 'PNG export')
      await waitFor('document.querySelector(".export-notice")?.textContent.includes("downloaded")', 'PNG export completion')
    }
    console.log(`${viewport.width}×${viewport.height}: six presets clicked; preset-list ${dimensions.clientHeight}px tall with ${dimensions.scrollHeight}px scroll content.`)
  }

  const files = await fs.readdir(downloads)
  const pngName = files.find((name) => name.endsWith('.png'))
  if (!pngName) throw new Error('Chrome did not download the expected PNG export.')
  const png = await fs.readFile(path.join(downloads, pngName))
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Downloaded export is not a PNG.')
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  if (width !== 1920 || height !== 1537) throw new Error(`Unexpected PNG dimensions ${width}×${height}.`)
  console.log(`Pointer gallery regression passed. Exported ${pngName}, ${width}×${height}.`)
} finally {
  socket?.close()
  browser.kill()
  await new Promise((resolve) => browser.once('exit', resolve))
  await server.httpServer.close()
  await fs.rm(profile, { recursive: true, force: true })
  await fs.rm(downloads, { recursive: true, force: true })
}
