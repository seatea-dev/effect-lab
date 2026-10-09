# 10: Polish and verify the complete desktop release

**What to build:** Complete the original dark desktop experience and provide release evidence for all approved visitor flows.

**Blocked by:** 03: Add the sample gallery and personal uploads, 08: Complete the six-preset gallery, 09: Add hold-to-compare

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Review typography, hierarchy, hover/focus states, reduced motion, sidebar scrolling, and image prominence at both desktop acceptance sizes.
- [ ] Run all feature flows and real worker/PNG checks in each claimed desktop engine.
- [ ] Measure preview responsiveness, near-cap exports, cancellation, retry, and repeated resource cleanup.
- [ ] Run typecheck, lint, the full Vitest suite, production build, and diff review.
- [ ] Verify repository-subpath loading for samples, thumbnails, worker, atlas, and UI assets.
- [ ] Complete README, asset credits, setup, review, and deployment documentation.
- [ ] Confirm CI failure blocks deployment and PR builds cannot deploy.
- [ ] Keep the repository private and publication disabled until separate approval and Pages eligibility are confirmed.
- [ ] Prepare screenshots and independent review evidence; address blockers and obtain final approval before commits, pushes, PR creation, or merges.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Feature acceptance criteria
- Testing decisions
- CI and Pages deployment
