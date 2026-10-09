# Product decisions

The user approved the V1 product requirements, technical specification, and ten-ticket breakdown. Repository setup and issue creation are authorized. Each ticket still requires its own implementation-plan approval, followed by final approval before commits, pushes, PR creation, or merges.

## Creative direction

V1 follows a digital print studio direction. Its six effects are ASCII art, pixelation, Floyd–Steinberg dithering, halftone, edge detection, and threshold. Presets form a modest, related collection rather than a broad catalog of unrelated styles.

## Presets

V1 includes six curated presets, one per effect: Terminal, Mosaic, Vintage Dither, Newsprint, Blueprint, and Ink.

Preset definitions are data, separate from UI components. Each preset identifies its effect and parameter values. Multiple presets may reference the same effect; adding them later must not require an architectural change.

Preset thumbnails are fixed, pre-generated images based on the same bundled sample image. Dynamic thumbnails of the selected source image are outside V1.

## Source images and first visit

Include five bundled sample images covering portrait, architecture, nature, urban photography, and abstract or geometric artwork. Document the sources and licenses of the final assets and optimize their size. Samples require no external API.

Display the five samples in a compact thumbnail strip beneath the main preview, alongside an Upload button. Selecting a sample immediately updates the preview using the active settings.

Retain one uploaded image alongside the samples during a visit. A subsequent successful upload replaces it. Visitors can switch between that upload and the samples.

Start with the urban sample and Vintage Dither applied so visitors can experiment immediately.

## Selection and reset behavior

Switching the source image preserves the active effect and its settings.

Selecting an effect restores its last-used settings for the current visit. Selecting a preset replaces the active effect and settings with the preset's defaults.

Selecting an effect directly clears the preset selection. Changing a preset's settings retains its name and displays a Modified indicator.

Reset Effect and Reset Preset are separate actions. Reset Effect restores the effect's built-in defaults and clears the preset selection. Reset Preset restores the selected preset's defaults and clears its Modified indicator. Neither action changes the source image.

## Effect controls

| Effect | Controls | Initial preset |
|---|---|---|
| ASCII art | Character size, contrast, palette | Terminal |
| Pixelation | Block size, color count | Mosaic |
| Floyd–Steinberg dithering | Contrast, palette | Vintage Dither |
| Halftone | Dot spacing, contrast, palette | Newsprint |
| Edge detection | Sensitivity, invert | Blueprint |
| Threshold | Cutoff, invert | Ink |

Use a small collection of fixed palettes. A custom color picker is outside V1. ASCII output is an image; text download is outside V1.

## Supported experience

V1 targets desktop browsers. Mobile-specific layouts and mobile editing requirements are outside V1.

Use an original dark visual identity, clear typography and hierarchy, subtle motion and hover states, and a prominent preview. Grainrad is product inspiration, not a design to copy.

Use a three-column desktop workspace. The left sidebar contains branding, effects, and presets. The center contains the preview, sample image strip, upload control, and comparison control. The right sidebar contains effect controls, reset actions, and PNG export.

## Comparison and workspace view

Use a press-and-hold Show Original control with keyboard support. The original and processed image occupy the same position and display size.

Fit the preview to the workspace. Draggable comparison, manual zoom, and panning are outside V1.

## Session lifetime

Every reload starts with the curated urban sample and Vintage Dither preset. Last-used effect settings and the retained upload exist only during the current visit.

Saved sessions, undo history, persistent custom presets, and shareable settings links are outside V1. V1 includes only built-in presets, with no accounts, database, or cloud sharing.

## Preview and export

Texture sizes are relative to the image so exports preserve the preview's composition and apparent texture scale. Fine detail may differ between a reduced preview and a full-resolution export.

Accept JPEG, PNG, and WebP uploads up to 20 MB per file. Animated-image handling, SVG, and HEIC support are outside V1. Composite transparent regions onto a consistent light background before processing.

Export PNG at the source resolution when within a provisional 12-megapixel cap. Downscale larger exports while preserving aspect ratio. Display export dimensions and clearly notify visitors of downscaling before download. Show source dimensions separately when they differ.

The export cap is a performance limit to validate during implementation. It is not a permanent architectural restriction.

Use appropriately scaled previews for large source images. Parameter changes should remain responsive. Avoid unnecessary image decoding and repeated computation. Export uses the current source image, effect, and settings.

## Processing and failure behavior

Retain the last completed preview while processing and show a small progress indicator. Prevent export until the current settings finish rendering.

Stale rendering operations must never replace results for a newer image, effect, or parameter selection. Only results corresponding to the current selection may become the active preview or export.

A failed upload preserves the previous source image and settings and displays an inline error. A failed export preserves the editing session and offers retry. Provide clear loading, empty, and error states.

## Technology and quality constraints

Use React, TypeScript, Vite, Tailwind CSS, the HTML Canvas API, Lucide React, and Vitest for algorithm tests. Keep image-processing algorithms modular and testable. Prioritize correctness, visual quality, and responsive previews over adding effects.

Process images entirely in the browser and support static deployment to GitHub Pages. Avoid backend services, databases, authentication, paid APIs, unnecessary dependencies, and premature architectural complexity.

## Workflow

Use one Codex implementation agent for this project. For each ticket, review the specification and obtain approval of a brief plan before implementation. Use TDD at the approved test boundaries, run relevant checks, and prepare a temporary handoff for independent code review in a fresh Sol session. Address blocking findings before requesting final approval.

The user switches models manually. Prefer Luna for straightforward implementation and Sol for planning, difficult debugging, and independent review. Do not modify global Herdr configuration or skills.

Human plan approval is required before implementation. Human final approval is required before committing or merging.

## GitHub integration

Use a dedicated GitHub repository, private initially, with main as the default branch. Check local Git state and whether a suitable repository already exists before initialization or creation. Never overwrite an existing remote or repository.

Include a suitable .gitignore, README, project documentation, and an installation lockfile. Create dependency-aware GitHub Issues only after the user approves the proposed tickets and plan. Each issue includes scope, acceptance criteria, dependencies, and specification references. Avoid separate administrative issues.

Implement on feature branches associated with their GitHub Issues. Use the pr skill for pull-request descriptions with change summaries, testing evidence, and screenshots for UI changes. Final approval is required before committing, pushing, creating a PR, or merging. Do not automatically merge pull requests.

Use lightweight GitHub Actions checks on pull requests and pushes to main for TypeScript, linting, tests, and production builds. Prepare GitHub Pages configuration but leave publishing disabled until separate publication approval. After that approval, deployment can follow successful checks when approved changes merge into main. Support the repository subpath in Vite and bundled asset URLs. Do not add paid services or unnecessary infrastructure.

Private-repository Pages eligibility depends on the existing GitHub plan. Keep the repository private unless the user separately approves a visibility change. If the account cannot host Pages for a private repository, defer publication until that decision is resolved rather than buying a plan or changing visibility automatically.
