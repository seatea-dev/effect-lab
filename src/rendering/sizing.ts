export type Dimensions = { width: number; height: number }
export type ImageSizes = { source: Dimensions; analysis: Dimensions; export: Dimensions; downscaled: boolean }

export const ANALYSIS_LONG_EDGE = 1200
export const EXPORT_PIXEL_CAP = 12_000_000

export function imageSizes(width: number, height: number): ImageSizes {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error('Image dimensions must be positive integers.')
  }
  const analysisScale = Math.min(1, ANALYSIS_LONG_EDGE / Math.max(width, height))
  // The final term accounts for rounding a very narrow image up to one pixel.
  const exportScale = Math.min(1, Math.sqrt(EXPORT_PIXEL_CAP / (width * height)), EXPORT_PIXEL_CAP / Math.max(width, height))
  const scaled = (scale: number): Dimensions => ({
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  })
  const exported = scaled(exportScale)
  return {
    source: { width, height },
    analysis: scaled(analysisScale),
    export: exported,
    downscaled: exported.width !== width || exported.height !== height,
  }
}
