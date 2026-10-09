# 05: Add Newsprint halftone

**What to build:** Apply Newsprint and adjust dot spacing, contrast, and palette with matching preview/export geometry.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Sample darkness on the normalized cell grid.
- [ ] Use the specified square-root radius rule and fixed axis-aligned grid.
- [ ] Expose the agreed controls and add Newsprint as preset data.
- [ ] Keep circles clean, clip border output, and preserve cell counts and normalized placement in export.
- [ ] Test white/black fields, area response, contrast, partial cells, and scale consistency; verify browser appearance.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Definitions and parameter contracts
- Algorithm behavior
- Preview, analysis, and texture scale
