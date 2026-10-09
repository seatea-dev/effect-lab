# 07: Add Terminal ASCII

**What to build:** Apply Terminal and adjust character size, contrast, and palette, then export the result as an image.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Bundle a versioned glyph atlas with font attribution and license.
- [ ] Use the same atlas and normalized glyph plan for preview and export.
- [ ] Map sampled darkness to an ordered coverage ramp and clip partial cells.
- [ ] Expose the agreed controls and add Terminal as preset data.
- [ ] Test glyph choices, contrast, cell counts, aspect ratio, and placement; verify glyph quality in large PNGs.
- [ ] Do not add text export or custom glyph controls.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Definitions and parameter contracts
- Preview, analysis, and texture scale
- Algorithm behavior
- UI and bundled assets
