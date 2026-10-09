# 09: Add hold-to-compare

**What to build:** Hold Show Original using pointer or keyboard to compare the matching source with the processed image.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Use the same fitted size, position, aspect ratio, and prepared background for both images.
- [ ] Support pointer hold and Space/Enter hold on the focused comparison button.
- [ ] Release on pointer up/cancel, lost capture, key up, blur, and focus loss.
- [ ] Ignore repeated keydown and do not interfere with other controls.
- [ ] Disable comparison until a newly selected source has a matching original/processed pair.
- [ ] Restore processed output without recomputation and verify all release paths.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- UI and bundled assets
- Asynchronous ordering and scheduling
- Feature acceptance criteria
