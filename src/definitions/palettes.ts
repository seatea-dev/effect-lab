export const INK = [23, 23, 23] as const
export const PAPER = [244, 241, 232] as const
export const PAPER_CSS = '#f4f1e8'

export const palettes = {
  ink: { name: 'Ink', ink: INK, paper: PAPER },
  terminal: { name: 'Terminal', ink: [141, 255, 154], paper: [16, 26, 19] },
  vintage: { name: 'Vintage', ink: [72, 59, 50], paper: [228, 213, 183] },
} as const
export type PaletteId = keyof typeof palettes
