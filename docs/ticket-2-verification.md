# Ticket 2 verification

Branch: feature/2-vintage-dither. Base: main at 0d5f257635ac6c70e78b97ee40e016f9f3295aa6. Implementation remains uncommitted. Independent Sol review and final human approval are pending.

## Local checks

Environment: macOS, Node 26.9.0. Node 24 is the existing CI baseline. No dependencies or CI configuration changed.

| Check | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm test | PASS, 44 tests in six files |
| npm run build | PASS |
| git diff --check | PASS |
| Changed-code security and resource inspection | PASS, no credentials, executable user input, new runtime requests, or persistent storage added. Existing worker, bitmap, and download URL cleanup retained. This was code inspection, not an external security scan. |
| Independent review | PENDING |
| Remote CI | NOT RUN, no push authorized |

Coverage was not measured. TDD red/green cycles covered the first hand-calculated dither fixture, palette output, invalid inputs, startup selection, and normalized Modified behavior. Additional fixtures cover boundaries, uniform fields, contrast changes, repeated output, input immutability, and batch-size independence. State tests preserve Threshold behavior and cover dither resets and effect memory. Controller tests cover stale results across effects alongside the existing ordering, export, and disposal checks.

## Chrome verification

Production build under /effect-lab/, Chrome 154.0.8037.99. Scripts use the existing Playwright installation in /Users/ctelang/Development/auto-apply/node_modules. No browser-test dependency was added.

- Startup and reload select the urban sample and Vintage Dither at contrast 1.2 with the Vintage palette. Reload reproduces the same raster.
- Keyboard contrast, all three palette choices, Modified state, effect switching, per-effect values, and both reset actions passed.
- Screenshots at 1440 by 900 and 1280 by 800 were inspected. The fitted preview, native controls, sidebar scrolling, and export remain usable.
- An 81-edit burst settled on the correct raster without another source fetch.
- The downloaded PNG has the PNG signature, 1920 by 1153 dimensions, and opaque pixels. Every pixel matches Chrome's nearest-neighbor scaling of the accepted preview. A manual floating-point sampling formula differed at some sampling boundaries; the browser's actual Canvas nearest-neighbor result is the comparison contract.
- Changing contrast during a test-only 500 ms encoding delay produced no stale download.
- A worker crash, delayed restart, another failed restart, and final recovery retained the accepted preview pixels and dimensions. Export stayed disabled until recovery; settings, subsequent edits, and PNG download passed.
- The actual worker produced the same SHA-256 raster hash with batch sizes 1, 7, 64, and 1024. A test-only substitution changed the generator's default at the worker script boundary. Effect switching during active one-row-batch diffusion settled on the correct current result.
- No uncaught page errors or external runtime HTTP requests occurred in the main smoke check.

## Evidence and rerun

Temporary evidence: /private/tmp/effect-lab-ticket-2-evidence

Files: browser-results.json, retry-results.json, batch-results.json, desktop-1440.png, desktop-1280.png, vintage-dither.png, recovered.png.

With the production preview on port 4185:

```sh
npm run preview -- --host 127.0.0.1 --port 4185 --strictPort
node /private/tmp/effect-lab-ticket-2-evidence/browser-check.mjs
node /private/tmp/effect-lab-ticket-2-evidence/retry-check.mjs
node /private/tmp/effect-lab-ticket-2-evidence/batch-check.mjs
```

The scripts require installed Chrome and the existing local Playwright installation. Localhost serving and browser launch needed command approval. Firefox, Safari, Edge, Node 24, and Linux CI were not exercised in this ticket. Complete cross-browser release checks remain in Ticket 10.

## Review notes

The implementation self-review covered standards and specification in separate sequential passes. It removed duplicated startup preset values and retained typed effect/parameter correlation. No known blocking local findings remain. This self-review does not replace the requested independent Sol review.

Preset photo thumbnails and the full gallery remain Ticket 8 work. No commit, push, PR creation, merge, or deployment occurred.
