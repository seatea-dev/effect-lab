# Ticket 3 implementation plan

Status: implementation and independent review are complete. Final approval is recorded; GitHub handoff is in progress.

Issue: https://github.com/seatea-dev/effect-lab/issues/3

Branch: feature/3-sample-gallery-uploads, created from updated main at 872231d5e3ed54c3bbc76cd6c7f3c0e196ca3961 after PR #12 merged.

1. Bundle five attractive samples covering portrait, architecture, nature, urban, and geometric subjects. Verify redistribution and modification rights, document attribution, and generate optimized thumbnails. Keep urban as the startup source. Fetch other full sources on selection.
2. Add one-click sample and retained-upload choices beneath the preview. Preserve effect values, preset association, and Modified state across source changes.
3. Accept JPEG, PNG, and WebP up to exactly 20,000,000 bytes. Validate signatures and successful decoding/preparation before replacement. Honor orientation and composite transparency onto #F4F1E8. Keep one upload for the visit.
4. Extend the existing controller/worker with guarded pending source selection. Preserve the last accepted preview, reject obsolete loads and exports, restore prior work on failure, and release replaced resources.
5. Use TDD for upload validation, source transitions, and controller races. Verify real decoding, orientation, transparency, source switching, failures, cleanup, PNG output, desktop sizes, and production subpath in Chrome. Run typecheck, lint, tests, and build.
6. Prepare a temporary handoff for independent review in a fresh Sol session. Use one implementation session. Keep commits, pushes, PRs, merges, and publication behind the required human approval gates.

Agreed test seams are the upload validator, session reducer, and rendering controller. Browser verification covers real image and Canvas APIs. Comparison controls remain in Ticket 9; this ticket retains the shared light-background preparation contract.
