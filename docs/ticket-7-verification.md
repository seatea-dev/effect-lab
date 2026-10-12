# Ticket 7 verification: Terminal ASCII

Local filesystem locations in this historical record are generalized as `temporary-artifacts/`. These labels identify external review artifacts, not files included in the repository.

## Scope

Added Terminal ASCII as a single active effect with character height, contrast, and fixed-palette controls. The built-in Terminal preset uses height 20, contrast 1.25, and the Terminal palette. The bundled glyph atlas is derived from IBM Plex Mono Regular 2.5.0; its source, license, attribution, measured coverage ramp, and checksums are recorded in [assets.md](assets.md).

Cell analysis stores deterministic glyph indices. Preview and export draw the same plan at their respective target dimensions using integer-index normalized boundaries, a fixed 3:5 glyph aspect ratio, and clipping at the output bounds. Partial cells sample only available source pixels without moving the nominal grid. The worker loads and caches the atlas and keeps its existing cancellation and revision checks.

The review found that separately rasterizing glyphs into the full atlas changed antialias coverage relative to the small-canvas measurements recorded in the metadata. The initial atlas-reading regression test failed at `i` then `r`, measuring `0.1112548793` then `0.1110382625`. The updated generator measures each candidate's alpha mask once, sorts those masks, and copies the same alpha bytes into each palette row. The ramp order remains ` .,:;irsh23X95ASHG#&MB@` because that is the measured order of the canonical masks. The new PNG decoder test measures the shipped asset, checks nondecreasing coverage, compares metadata within one alpha level averaged over the tile, and verifies exact alpha equality across palette rows. It also checks monotonic glyph coverage for 1,001 increasing darkness values.

The checked-in `scripts/generate-ascii-atlas.mjs` regenerated both the PNG and `src/effects/asciiAtlas.ts` from the licensed TTF. The resulting PNG checksum matches the documented value.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed: 13 test files, 115 tests |
| `npm run build` | Passed; Vite emitted the versioned atlas asset |
| `git diff --check` | Passed |

New coverage in `tests/ascii.test.ts` decodes the actual PNG using Node's zlib, then checks measured glyph ordering, metadata tolerance, equal masks across palette rows, white/black endpoints, midtone and contrast behavior, half-up quantization boundaries, palette selection, input immutability, partial-cell geometry, and normalized preview/export positions. Session and registry tests cover Terminal defaults, settings memory, Modified state, source preservation, effect switching, and separate reset actions. Worker cancellation coverage verifies stale ASCII work is discarded after a cooperative yield.

## Production Chrome verification

Ran the production build from `http://127.0.0.1:4187/effect-lab/` in Chrome. The regenerated atlas returned HTTP 200 from `/effect-lab/assets/terminal-atlas-v1-COn5LvvB.png`; there were no browser errors or external HTTP requests.

Confirmed ASCII defaults (24, 1.00, Ink), Terminal preset values (20, 1.25, Terminal), source switching while retaining the selected settings, preset reset, modified indicator behavior, per-effect settings memory, and effect reset. Uploaded a generated opaque black PNG at 1001 × 997, adjusted the ASCII settings, and decoded the live preview and exported PNG to RGBA. Both were 1001 × 997, fully opaque, and had the same full-image hash `8850e9e7`. Their sampled right and bottom edge pixels were opaque, including both glyph and paper pixels. The PNG signature was valid.

Uploaded a white 513 × 317 PNG. Preview and export each contained one color, Paper `#F4F1E8`, with alpha 255, and had the same hash `a50b277f`. Uploaded a horizontal grayscale gradient at 640 × 360 and used Terminal palette with contrast 1.55. Preview and export each contained 248 distinct RGB colors, had alpha 255 at every pixel, and had the same hash `70d2984d`.

The temporary Chrome screenshot is at `temporary-artifacts/effect-lab-ticket7-ascii.png` and is not part of the project. The regenerated atlas SHA-256 is `12616a96ef67522f7a9658858a06df9c95f1de578f88d3b8512fe578e5b39117`.

## Limitations

Browser verification covered Chrome only. The browser export comparison used an image below the 12-megapixel export cap. Large-image performance and visual differences in other browser rasterizers were not benchmarked.
