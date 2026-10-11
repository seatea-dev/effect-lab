import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [fontPath, outputPath, metadataPath = 'src/effects/asciiAtlas.ts'] = process.argv.slice(2)
if (!fontPath || !outputPath) {
  throw new Error('Usage: node scripts/generate-ascii-atlas.mjs <IBM-Plex-Mono-Regular.ttf> <output.png> [metadata.ts]')
}

const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? 'playwright'
const { chromium } = await import(playwrightModule.startsWith('.') || path.isAbsolute(playwrightModule)
  ? pathToFileURL(path.resolve(playwrightModule)).href
  : playwrightModule)
const font = (await fs.readFile(fontPath)).toString('base64')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  const result = await page.evaluate(async (fontBase64) => {
    const fontFace = new FontFace('Atlas IBM Plex Mono', `url(data:font/ttf;base64,${fontBase64})`)
    await fontFace.load()
    document.fonts.add(fontFace)
    const tileWidth = 144
    const tileHeight = 240
    const fontSize = 200
    const candidateRamp = [...' .,:;irsXA253hMHGS#9B&@']
    const palettes = ['#171717', '#8DFF9A', '#483B32']
    const metricsContext = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const fontCss = `${fontSize}px "Atlas IBM Plex Mono"`
    metricsContext.font = fontCss
    const metrics = metricsContext.measureText('M')
    const baseline = (tileHeight - (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)) / 2 + metrics.fontBoundingBoxAscent
    const glyphs = candidateRamp.map((glyph, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = tileWidth
      canvas.height = tileHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.font = fontCss
      context.textAlign = 'center'
      context.textBaseline = 'alphabetic'
      context.fillStyle = '#fff'
      context.fillText(glyph, tileWidth / 2, baseline)
      const pixels = context.getImageData(0, 0, tileWidth, tileHeight).data
      const alpha = new Uint8Array(tileWidth * tileHeight)
      let total = 0
      for (let pixel = 0; pixel < alpha.length; pixel++) {
        alpha[pixel] = pixels[pixel * 4 + 3]
        total += alpha[pixel]
      }
      return { glyph, index, alpha, coverage: total / (255 * tileWidth * tileHeight) }
    }).sort((a, b) => a.coverage - b.coverage || a.index - b.index)

    const atlasWidth = tileWidth * glyphs.length
    const atlasHeight = tileHeight * palettes.length
    const atlas = document.createElement('canvas')
    atlas.width = atlasWidth
    atlas.height = atlasHeight
    const context = atlas.getContext('2d')
    const image = context.createImageData(atlasWidth, atlasHeight)
    palettes.forEach((color, paletteRow) => {
      const channels = color.match(/[0-9A-F]{2}/gi).map((part) => Number.parseInt(part, 16))
      glyphs.forEach(({ alpha }, column) => {
        for (let y = 0; y < tileHeight; y++) {
          for (let x = 0; x < tileWidth; x++) {
            const sourceIndex = y * tileWidth + x
            const targetOffset = ((paletteRow * tileHeight + y) * atlasWidth + column * tileWidth + x) * 4
            image.data[targetOffset] = channels[0]
            image.data[targetOffset + 1] = channels[1]
            image.data[targetOffset + 2] = channels[2]
            image.data[targetOffset + 3] = alpha[sourceIndex]
          }
        }
      })
    })
    context.putImageData(image, 0, 0)
    const blob = await new Promise((resolve, reject) => atlas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode atlas.')), 'image/png'))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    return {
      png: btoa(binary),
      width: atlasWidth,
      height: atlasHeight,
      tileWidth,
      tileHeight,
      fontSize,
      baseline,
      ramp: glyphs.map(({ glyph }) => glyph).join(''),
      coverage: glyphs.map(({ coverage }) => coverage),
    }
  }, font)

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true })
  await fs.writeFile(outputPath, Buffer.from(result.png, 'base64'))
  const metadata = `import atlasUrl from '../assets/terminal-atlas-v1.png'\nimport type { PaletteId } from '../definitions/palettes'\n\n// Glyphs are ordered by measured alpha coverage in IBM Plex Mono Regular 2.5.0.\nexport const GLYPH_RAMP = ${JSON.stringify(result.ramp)}\nexport const GLYPH_COVERAGE = ${JSON.stringify(result.coverage, null, 2)} as const\n\nexport const GLYPH_TILE_WIDTH = ${result.tileWidth}\nexport const GLYPH_TILE_HEIGHT = ${result.tileHeight}\nexport const GLYPH_ATLAS_URL = atlasUrl\nexport const GLYPH_PALETTE_ROW: Record<PaletteId, number> = { ink: 0, terminal: 1, vintage: 2 }\n`
  await fs.mkdir(path.dirname(path.resolve(metadataPath)), { recursive: true })
  await fs.writeFile(metadataPath, metadata)
  delete result.png
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
}
