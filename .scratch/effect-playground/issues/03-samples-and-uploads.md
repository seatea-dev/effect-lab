# 03: Add the sample gallery and personal uploads

**What to build:** Choose any of five bundled samples or one retained personal upload without losing effect settings.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Bundle portrait, architecture, nature, urban, and abstract/geometric samples with documented licenses and optimized thumbnails.
- [ ] Make sample selection a one-click operation in a strip below the preview.
- [ ] Accept JPEG, PNG, and WebP up to 20,000,000 bytes; validate formats and decode successfully before replacement.
- [ ] Honor orientation and composite transparency onto the agreed light background.
- [ ] Retain one upload and replace it only after a successful new upload.
- [ ] Preserve the previous image on failure and reject obsolete load/decode results.
- [ ] Verify source switching, limit boundaries, corruption, orientation, transparency, and resource cleanup.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Source image acceptance criteria in Feature acceptance criteria
- Image ingestion and resource ownership
- Asynchronous ordering and scheduling
- UI and bundled assets
