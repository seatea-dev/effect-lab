import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const root = process.cwd()
const chrome = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const debugPort = Number(process.env.CHROME_DEBUG_PORT ?? 9418)
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'effect-lab-preset-thumbnails-'))
const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
})
let browser
let socket

try {
  await server.listen()
  browser = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })
  const endpoint = `http://127.0.0.1:${debugPort}`
  let page
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      page = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json())
      break
    } catch {
      await delay(100)
    }
  }
  if (!page?.webSocketDebuggerUrl) throw new Error('Headless Chrome did not expose its DevTools endpoint.')

  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const pending = new Map()
  const browserErrors = []
  let nextCommandId = 0
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.text)
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      browserErrors.push(message.params.entry.text)
    } else if (message.method === 'Network.loadingFailed') {
      browserErrors.push(`Network ${message.params.errorText}: ${message.params.requestId}`)
    }
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextCommandId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })

  await Promise.all([send('Runtime.enable'), send('Page.enable'), send('Network.enable'), send('Log.enable')])
  await send('Page.navigate', { url: 'http://127.0.0.1:4178/effect-lab/scripts/preset-thumb-generator.html' })

  let generated
  let lastState = 'page not ready'
  for (let attempt = 0; attempt < 180; attempt++) {
    const result = await send('Runtime.evaluate', {
      expression: 'document.querySelector("#result")?.textContent ?? "page pending"',
      returnByValue: true,
    })
    lastState = result.result?.value ?? lastState
    if (lastState.startsWith('{"error"')) throw new Error(`${lastState}\n${browserErrors.join('\n')}`)
    if (lastState.startsWith('{"terminal"')) {
      generated = JSON.parse(lastState)
      break
    }
    await delay(500)
  }
  if (!generated) throw new Error(`Chrome renderer timed out: ${lastState}\n${browserErrors.join('\n')}`)

  const expected = ['terminal', 'vintage-dither', 'ink', 'mosaic', 'blueprint', 'newsprint']
  if (Object.keys(generated).length !== expected.length || expected.some((id) => !generated[id])) {
    throw new Error('Chrome did not render every bundled preset.')
  }
  for (const id of expected) {
    const bytes = Buffer.from(generated[id], 'base64')
    if (bytes.subarray(0, 3).toString('hex') !== 'ffd8ff') throw new Error(`Chrome returned an invalid JPEG for ${id}.`)
    await fs.writeFile(path.join(root, 'src/assets', `preset-${id}.jpg`), bytes)
    console.log(`${id}: ${bytes.length} bytes`)
  }
  console.log('Rendered six thumbnails through the production image worker and preset definitions.')
} finally {
  socket?.close()
  if (browser && browser.exitCode === null) {
    browser.kill()
    await Promise.race([
      new Promise((resolve) => browser.once('exit', resolve)),
      delay(3000),
    ])
  }
  await server.close()
  await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 })
}
