# 01: Deliver the first runnable image-to-PNG slice

**What to build:** Process one bundled sample using Threshold and Ink in a runnable desktop workspace and download the result as PNG.

**Blocked by:** None (can start immediately after its plan approval).

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Verify or connect the dedicated private repository without overwriting existing content or remotes.
- [ ] Set up the approved stack, lockfile, README, ignore rules, and lightweight PR/main CI for typecheck, lint, tests, and build.
- [ ] Show a fitted sample preview with cutoff, inversion, numeric values, reset actions, dimensions, and processing/error feedback.
- [ ] Keep algorithms, definitions, session state, UI, and worker rendering/export separate.
- [ ] Use the shared analysis image, provisional 12-megapixel export limit, and visible downscaling notice.
- [ ] Reject stale previews, errors, and PNG downloads; keep scheduling and resource retention bounded.
- [ ] Pass meaningful threshold, sizing, state, and ordering tests plus real-browser preview/PNG checks.
- [ ] Prepare Pages configuration without publishing; obtain independent review and final approval before committing, pushing, or creating a PR.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Architecture and responsibilities
- Session transitions
- Preview, analysis, and texture scale
- Export contract
- Asynchronous ordering and scheduling
- GitHub repository and delivery workflow
- CI and Pages deployment
