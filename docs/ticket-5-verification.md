# Ticket 5 verification: Newsprint halftone

**Date:** 2026-10-10 (reverified after rebasing onto Ticket 6)
**Branch:** `feature/5-newsprint-halftone`

Halftone analyzes contrast-adjusted luminance once per top-left anchored normalized square cell. The plan retains one radius and the selected palette's ink and paper colors. Radius is half the effective cell spacing times the square root of darkness. The worker reuses this plan for analysis preview and source-sized PNG export, drawing antialiased Canvas circles and clipping to the image rectangle. Analysis is never repeated for export.

The controls use spacing 4–40 in steps of 1 (default 10), contrast 0.5–2 in steps of 0.05 (default 1), and the fixed Ink, Terminal, and Vintage palettes. Newsprint applies spacing 8, contrast 1.15, and Ink. The halftone settings join the existing per-visit reducer memory, preset Modified state, and reset actions.

## Automated checks

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | PASS | TypeScript completed without errors. |
| `npm run lint` | PASS | ESLint completed without warnings or errors. |
| `npm test` | PASS | 12 files, 103 tests passed after integrating Ticket 6. Includes white/black radii, square-root response, per-pixel contrast clipping before cell averaging, immutable input, exact partial-cell centers and clipped sampling in portrait and landscape images, preview/export placement at target dimensions, selected palette colors, stale worker cancellation, Newsprint session behavior, and Blueprint regressions. |
| `npm run build` | PASS | Vite production build completed, including the image worker bundle. |
| `git diff --check` | PASS | No whitespace errors. |

## Chrome production preview

Ran the production build at `http://127.0.0.1:4188/effect-lab/` in an isolated Playwright Chrome context at 1440×900. Selected Newsprint, changed spacing, contrast, and palette, confirmed Modified, reset the preset, and confirmed spacing 8, contrast 1.15, and Ink. The preview canvas contained the expected Ink colors and antialiased edges. A separate palette pixel check found both Vintage ink (`72,59,50`) and paper (`228,213,183`) in the rendered canvas. Visual inspection confirmed the circles remain clean and circular through image edges. No browser page errors occurred.

Export PNG completed successfully. The downloaded file had a valid PNG signature, measured 2,668,796 bytes, and decoded dimensions of 1,920×1,153, matching the source. The screenshot reviewed for visual quality is `/private/tmp/effect-lab-ticket5-preview.png`.

## Partial-cell grid regression

Ran the production build at `http://127.0.0.1:4188/effect-lab/` in Chrome with an uploaded black 1001×1000 PNG and Halftone spacing set to 40. The preview and exported PNG both measured 1001×1000. Pixel inspection found Ink `(23, 23, 23, 255)` at the right edge near the nominal dot center and Paper `(244, 241, 232, 255)` between edge dots. Every exported pixel had alpha 255, and the browser reported no page errors. The exported file is `/private/tmp/effect-lab-black-1001x1000-halftone.png`.

Automated draw-plan tests record the actual circle calls. For this reproduction, the final horizontal centers are 940, 980, and 1020. Portrait and landscape tests check partial bottom and right cells separately, including a 997×733 image. Preview and export tests assert the nominal final centers at each target resolution. The draw path clips the circles to the output rectangle.

## Scope and limitations

The UI/effect tests are automated at the approved processor/draw and reducer seams. Chrome verification covers the production worker, Canvas circles, controls, preset reset, and PNG download. It was a single Chrome run and does not establish support in other browsers.

## Ticket 6 integration recheck

After Ticket 6 merged as `942cc71`, rebased this branch and reran typecheck, lint, all 103 tests, production build, and `git diff --check`; all passed. Repeated the 1001×1000 spacing-40 reproduction in Chrome against the rebased production build at `/effect-lab/`. The preview and downloaded PNG were both 1001×1000, fully opaque, and had matching ink at the clipped edge-dot center and paper between edge dots. No browser errors occurred. The export is `/private/tmp/effect-lab-black-1001x1000-halftone.png`; screenshot: `/private/tmp/effect-lab-ticket5-grid-regression.png`.
