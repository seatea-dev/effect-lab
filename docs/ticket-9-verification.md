# Ticket 9 verification: hold-to-compare

Local filesystem locations in this historical record are generalized as `temporary-artifacts/`. These labels identify external review artifacts, not files included in the repository.

## Automated checks

All checks ran in the isolated `feature/9-hold-to-compare` worktree at `temporary-artifacts/effect-lab-ticket9`, based on `734f57347ecc1fcfac54b8a0eb1335680a97086e`.

| Check | Result |
| --- | --- |
| `npm test` | PASS, 117 tests across 13 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS, Vite production build created `dist/` |
| `git diff --check` | PASS |

New controller coverage verifies that accepted previews deliver both images, and that stale or disposed preview pairs close both transferred bitmaps. Worker coverage verifies that the original bitmap matches the processed preview dimensions, transfers with the processed bitmap, and comes from the cached prepared source during parameter renders.

## Production browser check

The production preview ran at `http://127.0.0.1:4179/effect-lab/`. Headless Google Chrome 154.0.8037.99 loaded the Vite production build at the GitHub Pages subpath. A focused Playwright run exercised:

- Comparison disabled while an image source was loading, then enabled after its matching pair arrived.
- Original and processed pixels differed, both canvases were opaque, and both canvases had identical fitted bounds.
- Space and Enter press/release behavior, including ignored repeated keydown.
- Pointer up, pointer cancel, lost pointer capture, comparison-button blur, window blur, and document visibility loss.
- PNG export while the original was displayed. The downloaded `1920 × 1540` PNG matched the processed preview at every RGB pixel and had zero transparent pixels. The PNG was saved outside the repository at `temporary-artifacts/effect-lab-ticket9-export.png`.
- No browser page errors.

The temporary browser script and screenshot are outside the repository at `temporary-artifacts/effect-lab-ticket9-browser.mjs` and `temporary-artifacts/effect-lab-ticket9-comparison.png`. The CUA Chrome surface was unavailable, so this is headless production-browser verification rather than a manual interactive Chrome session.

## Remaining limits

The browser script is a local verification artifact, not a repository test command. No effect algorithms, preset values, or export processing rules changed.

## Integration after Ticket 8 merge

Ticket 9 was fast-forwarded from `734f57347ecc1fcfac54b8a0eb1335680a97086e` to merged `main` at `e2b8126` (PR #18). Its uncommitted implementation reapplied without conflicts. The combined tree passed typecheck, lint, production build, `git diff --check`, and all 120 Vitest tests across 13 files.

Headless Chrome 154 verified the production build at `/effect-lab/` on isolated port 4191. The compare interaction passed pointer and keyboard release, pointer cancellation, lost pointer capture, blur, visibility loss, and source replacement checks. Export during comparison remained 1920 × 1540, matched the processed preview pixel-for-pixel, and contained no transparent pixels. Chrome reported no page errors.

Because Ticket 8 and Ticket 9 both touch `App.tsx` and `styles.css`, the Ticket 8 gallery regression was also rerun against the combined build on isolated ports 4192 and 9432. All six presets remained pointer-accessible at 1440 × 900, 1280 × 800, and 1100 × 800; reset behavior, Modified state, source preservation, and PNG export passed.
