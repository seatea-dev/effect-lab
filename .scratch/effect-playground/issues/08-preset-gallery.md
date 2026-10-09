# 08: Complete the six-preset gallery

**What to build:** Browse six accurate fixed thumbnails and immediately apply curated styles to any selected source.

**Blocked by:** 02: Add Vintage Dither and the curated starting experience, 04: Add Mosaic pixelation and verify selection/reset behavior, 05: Add Newsprint halftone, 06: Add Blueprint edge detection, 07: Add Terminal ASCII

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Show Terminal, Mosaic, Vintage Dither, Newsprint, Blueprint, and Ink with names and selected states.
- [ ] Generate bundled thumbnails from the same urban sample using the production renderer and final preset definitions.
- [ ] Apply complete preset values without changing the selected image.
- [ ] Keep Modified and both reset actions consistent with session rules.
- [ ] Validate unique IDs, complete values, and effect references.
- [ ] Verify a second preset can reference an existing effect without UI or state schema changes.
- [ ] Do not generate thumbnails dynamically for uploaded images.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Presets in approved product decisions
- Definitions and parameter contracts
- Session transitions
- UI and bundled assets
