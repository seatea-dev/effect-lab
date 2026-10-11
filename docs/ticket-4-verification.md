# Ticket 4 verification

Branch: `feature/4-pixelation`. Base: `main` at `51123f8dd9d6964628800c6b56584c8b5ee2261f`. Issue: https://github.com/seatea-dev/effect-lab/issues/4. Plan approval was given before branch creation. No commit, push, PR, or merge was performed.

## Changes

- Added Mosaic pixelation with block-size controls, five fixed color-count options, deterministic half-up channel quantization, and the Mosaic preset.
- The analysis pass averages each normalized source cell once and retains a compact palette plus per-cell color indices. Preview and export paint those colors directly at their own target dimensions. Export no longer enlarges a preview raster.
- Block boundaries use each integer cell index and rational source-space numerator before division. The last row and column end exactly at the target dimensions. Cells below analysis-pixel resolution use the nearest analysis pixel for their color.
- Worker processing and drawing yield between block-row batches, preserving cancellation checks. Existing non-pixelation worker paths retain their raster cache.
- Session state retains Mosaic settings, Modified state, and separate Reset Effect and Reset Preset behavior.

## Automated checks

All checks passed on 2026-10-10:

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS, 84 tests in 10 files |
| `npm run build` | PASS |
| `git diff --check` | PASS |

The pixelation tests cover complete opaque RGB output for uniform-white 255 × 255, 58 × 58, 116 × 116, 232 × 232, and non-divisible 301 × 299 images; deterministic tie rounding and black/white endpoints; all five color counts; and partial final cells. Geometry tests inspect the rectangles actually painted at analysis and export dimensions, including 2001 × 201 landscape and 201 × 2001 portrait sources. They assert 4-pixel target boundaries at the beginning of each 2001-pixel long edge and full coverage at both partial edges. The same analyzed plan is drawn independently at preview and export sizes.

The broader suite also covers Mosaic defaults, presets, settings memory, Modified state, resets, source selection, uploads, worker cancellation/crash/stale-result handling, and existing Threshold and Vintage Dither behavior.

## Chrome verification

Tested the production build in Chrome 154.0.8037.99 at `http://127.0.0.1:4187/effect-lab/`, including the GitHub Pages subpath.

- Uploaded a uniform-white 255 × 255 PNG, applied Mosaic, and exported it. The downloaded PNG was 255 × 255; all pixels were white with alpha 255. No transparent pixels remained.
- Uploaded the reported 2001 × 201 image of alternating 4-pixel black and white vertical stripes, applied Mosaic, and exported it. The downloaded PNG was 2001 × 201 with no transparent pixels. Inspecting the exported PNG row directly showed color transitions at x = 4, 8, 12, 16, 20, continuing at 4-pixel intervals. This checks the target-size result rather than comparing it with an enlarged preview raster.
- No uncaught page errors occurred. The Chrome run took about 21 seconds. Downloaded PNG evidence is in `/private/tmp/effect-lab-ticket4-review-white-255.png` and `/private/tmp/effect-lab-ticket4-review-stripes-2001.png`.

Render latency and peak memory were not measured. Other browser engines were not tested; cross-browser checks remain part of Ticket 10.
