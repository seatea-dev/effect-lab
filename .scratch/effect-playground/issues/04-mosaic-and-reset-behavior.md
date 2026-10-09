# 04: Add Mosaic pixelation and verify selection/reset behavior

**What to build:** Apply Mosaic and tune block size and color count while preserving predictable effect memory and preset/reset behavior.

**Blocked by:** 01: Deliver the first runnable image-to-PNG slice

**Status:** ready-for-agent

**Implementation approval:** Pending approval of this ticket's brief plan. Final approval is required before commits, pushes, PR creation, or merges. Publication requires separate approval.

- [ ] Average RGB within normalized blocks, including partial border blocks.
- [ ] Quantize to the specified per-channel levels and enforce the displayed maximum color count.
- [ ] Expose block size and color-count controls and add Mosaic as preset data.
- [ ] Restore session settings when selecting an effect and clear preset association.
- [ ] Compute Modified from parameter equality and keep Reset Effect separate from Reset Preset.
- [ ] Preserve the source through preset, parameter, effect, and reset actions.
- [ ] Test averages, palette counts, normalized boundaries, and complete selection/reset sequences.

## Specification references

The approved technical specification is currently local at docs/spec.md and has not been committed or pushed. Relevant sections:

- Definitions and parameter contracts
- Session transitions
- Algorithm behavior
