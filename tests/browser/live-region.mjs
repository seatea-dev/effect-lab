import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

async function waitForPreview() {
  await page.waitForFunction(() => !document.querySelector('.export-button').disabled)
}

try {
  await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:4187/effect-lab/')
  await waitForPreview()
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live="polite"]')
    window.liveMutations = []
    window.liveObserver = new MutationObserver((records) => {
      window.liveMutations.push(...records.map(() => region.textContent))
    })
    window.liveObserver.observe(region, { characterData: true, childList: true, subtree: true })
  })

  await page.getByRole('button', { name: /^Threshold/ }).click()
  await waitForPreview()
  await page.locator('#cutoff').fill('120')
  await waitForPreview()
  await page.getByRole('button', { name: /^Floyd-Steinberg/ }).click()
  await waitForPreview()
  await page.locator('#contrast').fill('1.25')
  await waitForPreview()
  await page.waitForTimeout(20)
  assert.deepEqual(await page.evaluate(() => window.liveMutations), [], 'effect changes and preview renders must not mutate the source live region')

  await page.getByRole('button', { name: /^Architecture:/ }).click()
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Jefferson Memorial') && !document.querySelector('.export-button').disabled)
  await page.waitForTimeout(20)
  assert.deepEqual(await page.evaluate(() => window.liveMutations), ['Loading selected image.', 'Jefferson Memorial at dusk loaded.'])

  await context.route('**/portrait-*.jpg', (route) => route.request().url().includes('-thumb-')
    ? route.continue()
    : route.fulfill({ status: 500, body: 'sample load failure' }))
  await page.getByRole('button', { name: /^Portrait:/ }).click()
  await page.getByRole('alert').waitFor()
  await page.waitForFunction(() => document.querySelector('[aria-live="polite"]')?.textContent === '')
  await page.waitForTimeout(20)
  assert.deepEqual(await page.evaluate(() => window.liveMutations), ['Loading selected image.', 'Jefferson Memorial at dusk loaded.', 'Loading selected image.', ''])
  assert.match(await page.getByRole('alert').innerText(), /could not be loaded/i)

  console.log('Chrome live-region mutation regression passed.')
} finally {
  await context.close()
  await browser.close()
}
