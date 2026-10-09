# 02: Add Vintage Dither and the curated starting experience

**What to build:** Open the playground on the urban sample with the Vintage Dither preset and adjust contrast and palettes.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Implement deterministic Floyd-Steinberg diffusion with the specified weights, traversal, and boundary rules.
- [ ] Expose contrast and the fixed palette choices through definitions.
- [ ] Start and reload with the urban sample and Vintage Dither selected.
- [ ] Preserve dither grain and pattern between preview and export using the shared analysis raster.
- [ ] Verify hand-calculated patterns, palette-only output, boundaries, and batch-size independence.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Definitions and parameter contracts
- Algorithm behavior
- Preview, analysis, and texture scale
