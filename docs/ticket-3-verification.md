# Ticket 3 verification

Status: implementation and independent review are complete on feature/3-sample-gallery-uploads. Final implementation approval is recorded, and the GitHub handoff is in progress.

Base: 872231d5e3ed54c3bbc76cd6c7f3c0e196ca3961, Ticket 2 merge into main. Issue: https://github.com/seatea-dev/effect-lab/issues/3. Scope follows docs/spec.md, docs/product-decisions.md, and the approved docs/ticket-3-plan.md.

## Changes and ownership

- Five sample definitions have stable IDs, subject labels, accessible descriptions, full and thumbnail URLs, dimensions, attribution, and license links. Asset rights and modifications appear in docs/assets.md.
- Startup fetches only the urban full source. The gallery loads separate small thumbnails. Other full sources load on selection.
- Session state distinguishes the usable source, pending source, source intent, retained upload ID, and recoverable source error. Source changes preserve effect parameters, preset association, and Modified state.
- The existing worker validates upload signatures, decodes with image orientation, prepares opaque sRGB pixels on #F4F1E8, and generates a small upload thumbnail. Signature checks do not substitute for decoding.
- An accepted preview commits the candidate. Until then, the prior source, upload, canvas, and dimensions remain usable. Source failures restore the prior source with the latest settings. Renderer failures still offer Retry.
- Files and object URLs remain outside the session reducer. Superseded candidates and replaced uploads release their URLs; source bitmaps close after preparation. Controller scheduling and export validity checks retain their existing structure. There are no new dependencies.

## Automated checks

All passed on 2026-10-10 with Node v26.9.0:

- npm run typecheck
- npm run lint
- npm test, 68 tests in 9 files
- npm run build
- git diff --check

TDD cycles first failed for the missing upload validator, pending source selection behavior, source-preparation error routing, unresolved obsolete fetches, and gallery navigation after worker failure. Focused reruns passed after implementation. Additional tests cover exact byte-limit boundaries, complete signatures, stale successes/errors, failed upload retention, and the latest settings during rollback. Existing algorithm, session, controller disposal, worker retry state, and sizing tests also pass. Coverage percentages were not measured.

## Chrome verification

Production build served at /effect-lab/. Chrome 154.0.8037.99, macOS Darwin 27.0.0, Apple M6, 24 GB memory. Browser automation used the existing local Playwright installation outside this repository; no browser-test dependency was added.

Evidence is in /private/tmp/effect-lab-ticket-3-evidence:

- browser-check.mjs and browser-results.json
- browser-supplement.mjs and supplement-results.json
- desktop-1280.png, desktop-1440.png, sample-portrait.png, sample-architecture.png, sample-nature.png, sample-geometric.png, retained-upload.png
- transparent-export.png, oriented-export.png, oriented.jpg
- commons-metadata.json contains the retrieved Wikimedia file metadata and rights fields

Both scripts passed against the final build. Instrumentation wraps the real built worker to count fetches/decodes and inject delays, allocation failures, and a worker exception. It does not substitute a mock renderer or decoder. The main flow confirmed:

1. Exactly five sample choices. Startup fetched only urban as a full source, with five small gallery thumbnails. No external image requests.
2. All sample choices preserved contrast, palette, preset, and Modified state. Sample click-to-ready times were 91 to 157 ms for Vintage Dither at contrast 1.25. These measurements include automation overhead and are not a general performance guarantee.
3. Settings edits did not decode the source again. Preview, gallery, and export controls fit at 1280 × 800 and 1440 × 900. Screenshots were visually inspected.
4. JPEG, PNG, and WebP uploads succeeded. A JPEG with an unrelated filename and MIME type succeeded through signature and decoder validation. Exactly one upload choice remained after replacements, and switching to a sample and back reproduced its accepted pixel hash.
5. Unsupported signatures, corrupt JPEG data, and a 20,000,001-byte file preserved the prior upload, settings, and preview. A valid PNG padded to exactly 20,000,000 bytes decoded successfully.
6. EXIF orientation 6 changed 40 × 20 JPEG source dimensions to 20 × 40. The actual exported PNG had those oriented dimensions and the expected rotated black/white regions.
7. Fully transparent and partially transparent input composited onto the fixed paper before threshold processing. A real PNG download had a valid signature, opaque pixels, correct filename and dimensions, and zero pixel differences from the accepted 40 × 20 preview raster.
8. Delayed uploads could not replace a later sample or newer upload. Settings remained editable while decoding. A source switch during delayed PNG encoding suppressed the obsolete download.
9. Sample HTTP failure and injected canvas allocation failure restored a usable upload. A real worker exception followed by Retry reconstructed the retained source with the prior preview, dimensions, and settings intact.
10. Repeated uploads left exactly two live upload URLs, the retained file and its thumbnail, after the download URL timer expired. Supplemental bitmap instrumentation counted six decoded source bitmaps and six closes. Long upload filenames stayed within the heading and preserved the effect suffix in downloads.
11. Reload restored urban and Vintage Dither and removed the retained upload. No page errors occurred.

## Independent review follow-up

The review fixes add abortable worker fetch and response-body waits, preserve the controller's failed state and last accepted dimensions across gallery navigation, and add a polite live status for image loading and completion. Slider and effect updates do not change that announcement.

Automated checks pass: TypeScript, lint, all 68 tests in 9 files, production build, and `git diff --check`. The worker cancellation test uses a fetch promise that ignores its abort signal and never resolves. It confirms the latest request reaches a preview and the obsolete request never publishes one. The controller regression confirms gallery navigation retains the Retry error, accepted dimensions, and disabled export after a crash.

Chrome 154.0.8037.99 reproduced both reports against the production build. A routed architecture image request remained unresolved while a later portrait selection completed, and the late obsolete response did not replace it. After an injected worker crash, selecting Nature retained the previous canvas pixels and dimensions, kept Retry visible, and left export disabled. Retry rendered Nature. That browser run checked only the final live-region text after effect edits. It did not detect intermediate clear-and-restore mutations.

The follow-up browser test in `tests/browser/live-region.mjs` observes each child-list and text mutation in the polite live region. Run it against a production preview with Playwright resolvable to Node. Chrome confirmed there are no mutations during effect switches or parameter renders. Selecting a sample produces one loading message followed by one completion message. A failed sample load clears the polite message while the existing alert reports the error, so assistive technology receives one failure announcement. No page errors occurred.

## Review and limits

Self-review ran sequential Standards and Spec passes, with no remaining blocking findings identified. Input/resource inspection checked format gates, browser-local source URLs, escaped filename display, sanitized downloads, bounded candidates, and stale publication checks. No external security scanner ran.

The independent Sol review passed after its blocking and optional findings were resolved. Remote CI, Node 24, other browser engines, animated image fixtures, and a heap profiler were not exercised. Resource counts demonstrate disposal paths, not a full memory profile. Comparison controls remain in Ticket 9, and final preset thumbnails remain in Ticket 8. The shared preparation path retains the comparison background contract for that later work.
