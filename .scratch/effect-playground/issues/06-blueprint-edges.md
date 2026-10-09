# 06: Add Blueprint edge detection

**What to build:** Apply Blueprint and tune sensitivity and inversion to reveal image contours.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Implement Sobel gradients with specified border sampling and magnitude normalization.
- [ ] Use the fixed Blueprint palette and invert its output roles when requested.
- [ ] Higher sensitivity includes weaker contours without creating contours on flat fields.
- [ ] Add Blueprint as preset data and expose sensitivity and inversion.
- [ ] Test flat fields, known boundaries, sensitivity, inversion, valid border pixels, and export consistency.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Definitions and parameter contracts
- Algorithm behavior
- Numerical and algorithm fixtures
