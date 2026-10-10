# Ticket 2 implementation plan

Status: approved by the user in this conversation. Implementation is local and uncommitted; independent Sol review and final approval are pending.

## Scope and baseline

Issue: https://github.com/seatea-dev/effect-lab/issues/2

Branch: feature/2-vintage-dither, created from updated main at 0d5f257635ac6c70e78b97ee40e016f9f3295aa6 after PR #11 merged. The user approved this plan and authorized implementation on that branch. No commit, push, PR creation, merge, or publication is authorized.

Follow docs/spec.md and docs/product-decisions.md. Use one implementation session and a separate Sol session for independent review. The user switches models manually.

## Approved work

1. Add deterministic Floyd-Steinberg processing with the specified traversal, diffusion weights, boundaries, luminance, and contrast. Preserve floating-point error rows across cooperative worker batches.
2. Add typed dither parameters and Ink, Terminal, and Vintage palettes. Contrast runs from 0.5 to 2 in steps of 0.05. Effect defaults are contrast 1 and Ink; Vintage Dither is contrast 1.2 and Vintage.
3. Start and reload on the urban sample with Vintage Dither. Preserve Threshold/Ink, per-effect settings, Modified state, and separate resets.
4. Use the shared processed analysis raster for preview and nearest-neighbor PNG export. Keep existing scheduling, cancellation, stale-result rejection, recovery, and cleanup.
5. Use TDD at the approved effect processor and session-action boundaries. Check hand-calculated patterns, boundaries, opacity, palettes, input immutability, batch-size independence, and state transitions.
6. Run typecheck, lint, tests, and build. Verify startup, live controls, presets, PNG output, and recovery in Chrome. Prepare a temporary review handoff.

The user's stated priorities are identical output regardless of worker batch size and minimal changes to Ticket 1's rendering architecture.
