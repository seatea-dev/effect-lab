# Ticket 1 verification

Local filesystem locations in this historical record are generalized as `temporary-artifacts/`. These labels identify external review artifacts, not files included in the repository.

Verified locally on 2026-10-09. Branch: `feature/1-image-to-png`. Comparison base: `207d0db0d9dd029ca5801d6f18a9d86147a40e4a`. Changes remain uncommitted and include untracked application files.

## Automated checks

Environment: macOS, Node 26.9.0, npm 11.19.1. Node 24 is the configured CI baseline and has not been tested locally.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci --offline --cache temporary-artifacts/effect-lab-npm-cache` | PASS | Clean lockfile installation, 154 packages. npm reported zero known vulnerabilities. |
| `npm run typecheck` | PASS | TypeScript reported no errors. |
| `npm run lint` | PASS | ESLint reported no errors or warnings. |
| `npm test` | PASS | 33 tests in five files, including retry-state and worker-disposal regressions. Coverage was not measured. |
| `npm run build` | PASS | Vite produced the application, bundled image, CSS, and module worker. |
| `git diff --check` | PASS | No whitespace errors in the tracked diff. New application files were also inspected. |
| Changed-code security inspection | PASS | Reviewed asset URLs, worker messages, download URLs, and CI permissions. No credentials or executable user input added. This was a code inspection, not an external security scan. |
| GitHub Actions | UNAVAILABLE | Workflow configured locally; no push or remote run authorized. |
| GitHub Pages | NOT APPLICABLE | Artifact upload and deployment are disabled. No publication authorized. |

TDD covered the processor, sizing, session actions, and render-result contract. Endpoint tests caught floating-point luminance error at cutoff 255; integer weights fixed it. Controller tests cover queued previews, obsolete responses, bitmap ownership, export cancellation, retry, disposal, and display failures.

## Real-browser checks

The production build ran at `http://127.0.0.1:4173/effect-lab/` in Chrome 154.0.8037.99. Temporary Playwright scripts used an existing local Playwright installation rather than adding a project dependency.

- Actual worker startup, Canvas output, local subpath assets, opaque Ink/Paper output, and no external runtime HTTP requests passed.
- Three-column layout at 1440 by 900 and 1280 by 800 passed. Controls and export fit without overlap. Both screenshots were visually inspected.
- Keyboard cutoff/inversion, Modified state, Reset Effect, and Reset Preset passed.
- Downloaded PNG decoded at 1920 by 1153. Sampled pixels matched the nearest-neighbor preview pattern with zero mismatches.
- An 81-change parameter burst settled on the correct final raster. No uncaught page errors occurred.
- Failed source fetch and worker crash both recovered through Retry.
- A 6000 by 4000 source displayed the downscale notice and exported a 4242 by 2828 PNG. Parameter edits did not refetch the source. One local export measured 98 ms; this is not a cross-device performance guarantee.
- A tiny transparent fixture verified full/partial alpha compositing onto paper and no upscaling.
- A test-only encoding delay at the real worker boundary verified that changed settings prevented a stale PNG download.
- A real worker crash after the first preview, a delayed retry, and successful recovery retained the same 1200 by 720 canvas pixels and dimension label. Export stayed disabled through the failure and retry startup, then enabled after recovery. Chrome 154.0.8037.99 passed this regression.

Evidence is temporary, outside the repository:

- `temporary-artifacts/effect-lab-ticket-1-evidence/browser-results.json`
- `temporary-artifacts/effect-lab-ticket-1-evidence/browser-large-results.json`
- `temporary-artifacts/effect-lab-ticket-1-evidence/desktop-1440.png`
- `temporary-artifacts/effect-lab-ticket-1-evidence/desktop-1280.png`
- `temporary-artifacts/effect-lab-ticket-1-evidence/sixth-avenue-ink.png`
- `temporary-artifacts/effect-lab-ticket-1-evidence/near-cap.png`
- `temporary-artifacts/effect-lab-retry-regression.mjs`

These files were temporary review artifacts and are not repository test commands. The checks used installed Chrome and an external Playwright installation without adding a project dependency.

## Pending review

Independent review in a fresh Sol session remains pending. Firefox, Safari, Edge, Node 24, and the Linux CI runner have not been verified. Complete cross-browser release checks belong to Ticket 10. No blocking local test failures remain.

The repository remains private. No commit, push, PR, merge, or deployment was performed. Final human approval is still required for those actions.
