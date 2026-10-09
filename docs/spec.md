# V1 technical specification

Status: technical specification and ten-ticket breakdown approved. Repository setup and issue creation are authorized. Each ticket requires approval of its brief implementation plan before development. Commits, pushes, PR creation, merges, and publication require their applicable human approvals.

## Problem statement

Visitors need a creative image tool they can explore immediately, without uploading a file or learning many controls. The portfolio project needs convincing visual results and a polished desktop experience while remaining understandable to its maintainer.

## Solution

Build a desktop digital print studio with five bundled sample images, personal uploads, six effects, and six curated presets. Start with the urban sample and Vintage Dither. Visitors can change images, select a style, adjust a few parameters, hold a control to compare with the original, and download a PNG.

Process images locally in the browser. Use one effect at a time and static deployment. Integrate development with a dedicated initially private GitHub repository, dependency-aware issues, feature branches, reviewed pull requests, lightweight checks, and GitHub Pages.

## User stories

1. As a visitor, I want to see a processed image on arrival, so that I can understand the tool without uploading anything.
2. As a visitor, I want five different sample subjects, so that I can explore how an effect responds to different images.
3. As a visitor, I want to select a sample with one click, so that I can experiment without a separate confirmation.
4. As a visitor, I want settings to survive image changes, so that I can compare the same style across subjects.
5. As a visitor, I want to upload JPEG, PNG, or WebP, so that I can process my own photographs and artwork.
6. As a visitor, I want to switch between my upload and samples, so that I can explore without uploading repeatedly.
7. As a visitor, I want a successful new upload to replace my previous upload, so that I can work without managing a library.
8. As a visitor, I want invalid uploads to preserve my current work, so that a failed file does not reset the tool.
9. As a visitor, I want transparent image regions to have a predictable background, so that preview and export agree.
10. As a visitor, I want named preset thumbnails, so that I can choose a visual style before adjusting settings.
11. As a visitor, I want six related presets, so that the collection is easy to browse.
12. As a visitor, I want a preset to apply its effect and settings immediately, so that it is useful without manual setup.
13. As a visitor, I want to customize a preset, so that I can adapt the result to my image.
14. As a visitor, I want a Modified indicator, so that I know when my settings differ from a preset.
15. As a visitor, I want Reset Preset, so that I can return to the selected style's defaults.
16. As a visitor, I want Reset Effect, so that I can start from the effect's own defaults.
17. As a visitor, I want each effect to remember its last settings during my visit, so that switching effects does not discard adjustments.
18. As a visitor, I want ASCII controls for character size, contrast, and palette, so that I can adjust its density and appearance.
19. As a visitor, I want pixelation controls for block size and color count, so that I can vary its detail and color simplification.
20. As a visitor, I want dither controls for contrast and palette, so that I can tune tonal texture.
21. As a visitor, I want halftone controls for dot spacing, contrast, and palette, so that I can change its printed appearance.
22. As a visitor, I want edge sensitivity and inversion, so that I can control which contours remain visible.
23. As a visitor, I want a threshold cutoff and inversion, so that I can choose the black-and-white separation.
24. As a visitor, I want changes to update the preview without a separate Apply button, so that experimentation feels direct.
25. As a visitor, I want the newest settings to win during rapid changes, so that the preview always belongs to my current selection.
26. As a visitor, I want progress feedback while retaining the last completed preview, so that processing does not produce a blank workspace.
27. As a visitor, I want hold-to-compare with a keyboard equivalent, so that I can inspect the original in the same position.
28. As a visitor, I want my entire image fitted without cropping or distortion, so that I can judge the composition.
29. As a visitor, I want visible source and export dimensions, so that I know the output size.
30. As a visitor, I want a PNG using my current settings, so that I can use the result outside the application.
31. As a visitor, I want texture scale to remain consistent in export, so that a larger PNG does not change the chosen style.
32. As a visitor, I want a downscaling notice before export, so that the resolution limit is clear.
33. As a visitor, I want an export failure to preserve the session and allow retry, so that I do not lose adjustments.
34. As a visitor, I want each reload to start with the curated example, so that the application has a predictable starting state.
35. As a visitor, I want clear control labels, numeric values, focus states, and errors, so that the interface is usable without guesswork.
36. As the maintainer, I want algorithms separate from UI and browser orchestration, so that I can test image behavior without mounting the application.
37. As the maintainer, I want presets stored as data, so that several presets can reference one effect without UI changes.
38. As the maintainer, I want bundled assets with documented licenses, so that static deployment requires no image service.
39. As the maintainer, I want issues linked to branches and pull requests, so that implementation work remains reviewable.
40. As the maintainer, I want checks before deployment and mandatory human approval gates, so that automation respects my development workflow.

## Implementation decisions

### Architecture and responsibilities

Use React, TypeScript, Vite, Tailwind CSS, Canvas 2D, Lucide React, and Vitest. Use npm with a committed lockfile. Choose compatible stable versions at setup and document the supported Node version. Avoid a state-management library, routing library, effect plugin system, GPU pipeline, and backend.

Separate responsibilities into five small modules. These are conceptual boundaries, not separate packages.

| Responsibility | Owns | Must not own |
|---|---|---|
| Effect processing | Numeric transforms, grid sampling, palette quantization, glyph and dot placement | React, selection state, downloads, network requests |
| Definitions | Effect IDs, parameter schemas and defaults, palettes, presets, sample metadata | Mutable session state or rendering side effects |
| Rendering and image lifecycle | Decoding, analysis image preparation, Canvas drawing, worker scheduling, result validation, PNG encoding and cleanup | Sidebar layout or preset selection rules |
| Session state | Selected source, effect settings, preset association, revisions, status, user actions | Pixel loops or browser canvas resources |
| UI | Galleries, controls, workspace, comparison, dimensions, feedback | Algorithm implementations or worker message handling |

Use a small typed reducer for session transitions and one rendering controller connected through a React hook. The controller hides worker messages and disposable resources. Do not put ImageBitmap objects, canvases, or pixel arrays in reducer state.

Algorithms receive immutable opaque sRGB pixel data and validated parameters. Raster effects return pixel results; ASCII and halftone produce simple cell descriptions that the Canvas adapter draws. These two output forms are enough for V1. Do not build a generalized render graph.

Use one dedicated module worker with OffscreenCanvas for image preparation, processing, drawing, and PNG encoding. The main thread receives completed preview bitmaps and download blobs. Keep the visible canvas on the main thread so it only displays results the controller accepts. Do not let the worker paint directly into the visible canvas.

Target current stable desktop Chrome, Edge, Firefox, and Safari. Check worker, bitmap decoding, OffscreenCanvas 2D, and PNG encoding capabilities at startup. Verify the actual worker capability with a handshake. Unsupported environments receive a clear explanation rather than a second rendering implementation in V1. Browser smoke testing is required before claiming support. OffscreenCanvas and bitmap APIs are defined in the [HTML canvas standard](https://html.spec.whatwg.org/multipage/canvas.html#the-offscreencanvas-interface) and [bitmap standard](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-createimagebitmap).

### Definitions and parameter contracts

Effect definitions have a stable ID, label, control schema, validated default parameters, and processor reference. Use effect-specific TypeScript parameter types discriminated by effect ID. Numeric controls define minimum, maximum, step, and display format. Enum controls reference fixed allowed values. Validate definitions at startup in development and through tests.

Presets have independent stable IDs, names, effect IDs, complete parameter values, and bundled thumbnail URLs. Do not key presets by effect ID or derive preset selection from the selected image. Multiple presets can reference the same effect without a schema change.

Sample definitions have stable IDs, subject labels, accessible descriptions, full asset and thumbnail URLs, dimensions, source attribution, and license metadata.

The following parameter values are the proposed technical starting points. Visual QA may tune defaults and palette colors without adding controls or changing their meaning. Keep final values in definitions and regenerate thumbnails after any preset change.

| Effect | Parameter ranges and defaults | Preset values |
|---|---|---|
| ASCII | Character height 12 to 64 units, step 1, default 24; contrast 0.5 to 2, step 0.05, default 1; palette default Ink | Terminal uses height 20, contrast 1.25, Terminal palette |
| Pixelation | Block size 4 to 64 units, step 1, default 12; color count 8, 27, 64, 125, or 216, default 64 | Mosaic uses block size 20 and 27 colors |
| Floyd-Steinberg dithering | Contrast 0.5 to 2, step 0.05, default 1; palette default Ink | Vintage Dither uses contrast 1.2 and Vintage palette |
| Halftone | Dot spacing 4 to 40 units, step 1, default 10; contrast 0.5 to 2, step 0.05, default 1; palette default Ink | Newsprint uses spacing 8, contrast 1.15, Ink palette |
| Edge detection | Sensitivity 0 to 100, step 1, default 50; invert default false | Blueprint uses sensitivity 60 and no inversion |
| Threshold | Cutoff 0 to 255, step 1, default 128; invert default false | Ink uses cutoff 140 and no inversion |

One texture unit is one thousandth of the source image's shorter dimension. It is independent of viewport size, device pixel ratio, and output resolution. Compute cell boundaries from their indices in normalized image coordinates rather than accumulating rounded pixel widths.

Use three fixed two-color palettes: Ink with dark ink and warm light paper, Terminal with bright green ink and near-black paper, and Vintage with dark brown ink and cream paper. Proposed colors are Ink #171717 and #F4F1E8, Terminal #8DFF9A and #101A13, and Vintage #483B32 and #E4D5B7. Store palette colors as explicit sRGB values and ink/paper roles. Edge detection uses a fixed Blueprint pair, #BCEBFF ink on #123B63 paper. Threshold uses the Ink pair. Inversion swaps foreground and background roles.

### Session transitions

Session state contains the active source ID, any pending source selection, one retained upload descriptor, active effect ID, parameter values per effect, optional preset ID, current revision, accepted preview revision, and load/render/export statuses.

- Startup selects the urban sample, applies Vintage Dither, and initializes other effects to their built-in defaults.
- Selecting a source preserves the active effect, parameters, and preset association. It invalidates pending render and export results immediately.
- A successful upload replaces the retained upload and selects it. A failed upload preserves the previous source and retained upload. Keep the prior file until its replacement has decoded and prepared successfully.
- Selecting an effect restores that effect's last values in this session and clears preset association, including when the selected effect is already active.
- Selecting a preset replaces the active effect's values with a copy of its parameter data and selects its preset ID. It does not alter any source image.
- Parameter edits update the active effect's session values. Retain preset association while computing Modified from exact equality of normalized parameter values. Returning all values to the preset defaults clears Modified automatically.
- Reset Preset restores that preset's values and clears Modified. Disable or hide this action when no preset is associated.
- Reset Effect restores built-in defaults, updates that effect's session values, and clears preset association.
- Neither reset changes the source. A reload creates a new session. Do not write session data or uploaded images to localStorage, IndexedDB, or a server.

Disable export while a source selection is pending, while the accepted preview revision differs from current state, or while an export is running. Holding Show Original does not change settings or create a processing revision.

### Image ingestion and resource ownership

Accept a single local JPEG, PNG, or WebP file up to 20,000,000 bytes. Validate size and recognized file signature rather than trusting extension or MIME alone. Decoding must succeed before committing the replacement. The file picker advertises supported types. Drag-and-drop is not required.

Animated-image playback or frame selection is not supported. If the decoder accepts an animated PNG or WebP, use its default still frame consistently and label the upload as a still image. Do not add an animation parser solely to reject such files. SVG, HEIC, and other formats receive a clear unsupported-format message.

Honor the decoder's image orientation so phone photographs appear upright. Use oriented dimensions for the UI and export. Prepare sRGB pixel data and fill transparent regions with #F4F1E8 before effect processing or original comparison. Preview and export are opaque. V1 does not promise preservation of metadata, ICC profiles, or camera EXIF in the PNG.

Retain the uploaded File or Blob for this visit. Use same-origin bundled assets. Keep only the active decoded source, its bounded analysis data, the last accepted preview/original pair, and at most one export job. Release replaced source bitmaps after active work relinquishes them. Cache encoded sample assets through the browser's normal asset cache. Do not retain all decoded samples or a history of processed outputs.

Parameter changes never trigger decoding again. Source switches may decode the newly selected image again, which is acceptable for five optimized samples. Discard stale decoded candidates and close their bitmaps. Revoke download URLs after use and dispose resources on controller teardown. Clean up workers on teardown so React development remounts do not leak workers.

The byte limit does not guarantee that every compressed image fits browser memory. A decode, allocation, or dimension failure must produce a recoverable error and preserve the last usable image. Do not silently claim successful processing of an image that could not be prepared.

### Preview, analysis, and texture scale

Prepare one analysis image per source. Its longer dimension is at most 1,200 pixels, with no upscaling of smaller sources. Preserve aspect ratio, round dimensions down with a minimum of one pixel, composite the light background, and cache its RGBA data. This analysis limit is a named performance setting rather than a constant embedded in each algorithm.

Analysis dimensions depend only on source dimensions and that setting. They never depend on workspace size or device pixel ratio. Changing the setting invalidates analysis and every derived result.

Both preview and export analyze the same prepared pixels and normalized settings. This is a deliberate V1 quality trade-off. High-resolution output preserves the chosen texture and has more raster resolution, but does not reveal additional photographic detail absent from the analysis image. Do not rerun Floyd-Steinberg independently at export resolution, which would change its grain and pattern.

The preview renders at analysis dimensions and fits into the available workspace without cropping. Original comparison uses the same prepared source and dimensions. Resizing the browser changes display size only. It does not change cell counts, parameters, or the PNG.

For ASCII and halftone, calculate cell samples and geometry once in normalized image coordinates. Draw glyphs or dots at preview or export dimensions using the same plan. The number, position, and tonal decisions remain the same. For pixelation, use the same block samples and colors and draw blocks at target dimensions. For dither, threshold, and edges, scale the fixed analysis raster to the target with image smoothing disabled. This preserves their discrete marks rather than introducing new pixel decisions.

Use one versioned bundled monospace glyph atlas for both ASCII preview and export. Generate it from a suitably licensed font and record the font license. This avoids OS-dependent font substitutions and a separate font-loading path inside the worker. Choose an atlas resolution adequate for the maximum supported export during visual QA.

### Algorithm behavior

Use deterministic algorithms without random input. Pixel buffers are immutable inputs. Grayscale conversion uses 0.2126R + 0.7152G + 0.0722B on prepared sRGB channel values. This is an explicit artistic grayscale rule, not a claim of full color-managed linear-light processing. Contrast maps normalized luminance through clamp of 0.5 plus contrast times luminance minus 0.5.

| Effect | Required behavior |
|---|---|
| ASCII | Average contrast-adjusted luminance within each rectangular glyph cell. Use the atlas's fixed width-to-height ratio. Map darkness to a fixed glyph ramp ordered by measured coverage. Draw the ink glyph on palette paper. A white field selects the lightest glyph, and a black field selects the densest glyph. Clip partial cells at image edges. |
| Pixelation | Average RGB within square normalized blocks, including partial border blocks. Quantize each channel to q equally spaced levels, where q is 2, 3, 4, 5, or 6 and the color-count control displays q cubed. The output contains at most that many colors. Draw solid blocks without gaps or smoothing. |
| Floyd-Steinberg dithering | Traverse rows left to right. Start with darkness equal to one minus contrast-adjusted luminance. Add accumulated error, then select ink when the value is at least 0.5 and paper otherwise. Diffuse the difference between that value and the selected binary coverage using 7/16 to the right, 3/16 to lower left, 5/16 below, and 1/16 to lower right. Use float error storage, keep in-bounds recipients only, and preserve row error across processing batches. Map the binary result to the selected palette. |
| Halftone | Average contrast-adjusted darkness within square cells. Draw one centered ink circle per cell on paper, with radius equal to half the cell spacing times the square root of darkness. Use a fixed axis-aligned grid. White has no dots; black has maximum dots. Antialias circle boundaries and clip output at image edges. |
| Edge detection | Compute Sobel horizontal and vertical gradients on analysis luminance. Clamp border sampling to the nearest pixel. Normalize magnitude by 4 times 255 times the square root of 2, capped at 1. Retain a contour when magnitude is positive and at least 1 minus sensitivity divided by 100. Map contour and background to the fixed Blueprint pair, swapping roles for invert. Higher sensitivity includes weaker contours. |
| Threshold | Compare prepared luminance with cutoff. Values at or above cutoff select paper; lower values select ink. Invert swaps output roles. No blur, extra contrast control, or adaptive thresholding. |

### Export contract

The export job captures source ID, current revision, effect ID, normalized parameters, and output dimensions. Only allow it to start after the current preview completes successfully.

For oriented source dimensions W and H, compute scale as the smaller of 1 and the square root of 12,000,000 divided by W times H. Round W times scale and H times scale down to positive integer dimensions. The pixel count must not exceed the cap. Rounding may introduce an aspect-ratio difference of at most one output pixel. Never upscale a smaller source.

If a browser's maximum canvas dimension prevents allocation despite the pixel cap, report that limitation and retain the session. Do not silently produce a smaller PNG than the displayed dimensions. The 12-megapixel cap stays in one configurable policy and may change after measured performance review.

Display export dimensions continuously and show a visible downscaling notice when they differ from the source dimensions. Use a single PNG encoding pass on the worker's completed output canvas. Return a Blob, then create a temporary download URL on the main thread. Use a sanitized filename containing the source basename and active style or effect. The PNG contains only the processed image, without controls, branding, or comparison overlays.

If the user changes images or settings during export, invalidate that job and discard its eventual PNG. Show a brief cancellation notice and allow export again when the latest preview is ready. Re-check validity after asynchronous PNG encoding and immediately before triggering download. Comparison holds and display resizing do not cancel an export.

### Asynchronous ordering and scheduling

Use monotonically increasing revisions for every source intent, preset, effect, parameter, or reset change. Also use a unique request ID for each load/render/export attempt and a worker-instance ID so replies from a disposed worker cannot be accepted.

A request includes revision, source identity, effect ID, normalized parameters, target dimensions, and operation kind. A response repeats its identifying fields. A preview result is eligible only when it matches the current revision and desired source, is the latest request for that operation, and comes from the active worker. An export additionally requires the still-current captured export request. Validate failures and progress messages by the same rules so an old error cannot replace current status.

Apply this rule at each asynchronous boundary: asset fetch, bitmap decode, analysis preparation, effect completion, bitmap transfer, PNG encoding, and final publication. Source decode success alone is insufficient to publish a preview. An older upload must not replace a newer upload or a sample selected after it began.

Maintain at most one executing processing job and one pending preview, replacing that pending preview when newer input arrives. Coalesce slider changes to one scheduling action per animation frame. Invalidate prior revisions immediately, not after debounce or completion. Keep numerical control values responsive even before a new preview appears.

Give long row or cell loops coarse cooperative batches so worker messages can be handled between batches. Preserve algorithm state, especially diffusion error rows, across those yields. Check cancellation before and after batches. A worker cannot observe a cancellation message while running one uninterrupted synchronous loop. Revision checks remain mandatory even when cooperative cancellation works.

Preview work takes priority over an invalidated export. Uninterruptible decode or PNG encoding may finish, but its result must be discarded. Do not let obsolete results create an unbounded job queue. Keep export serialization to one job.

Keep the last accepted preview visible with an Updating indicator while current work runs. Its metadata must identify the source it actually shows, not claim it belongs to a newly selected source. Disable comparison during a source switch until the current source's original/processed pair is ready. During parameter-only updates, comparison can use the retained pair for the same source.

On current preview failure, keep the last completed image, show an inline Retry action, and leave export disabled. On source-load failure, restore the previous valid source selection, preserve the latest chosen effect settings, and render again if needed. On export failure, keep the current preview and settings and enable retry when eligible. Worker crash recovery recreates the worker on Retry using the retained source descriptor and current settings.

### UI and bundled assets

Use an original dark three-column desktop design. Left contains branding, effect buttons, and a browsable six-card preset gallery. Center contains the fitted image, status, dimensions, comparison control, five sample thumbnails, one retained upload thumbnail when present, and Upload. Right contains the active effect's controls, reset actions, and export.

Keep the image dominant. Permit sidebar scrolling without hiding the main preview or export action. Use subtle hover and selection states, readable typography, visible keyboard focus, reduced-motion support, and semantic native controls. Lucide icons supplement labels rather than replacing them.

Show slider values beside their labels. Keyboard changes follow the same input and rendering rules as pointer changes. Gallery buttons expose accessible names and selected states. Loading and error messages use appropriate live announcements without announcing every slider movement.

Show Original is active only while the button is held by the pointer or while Space or Enter is held on its focused button. Release on pointer up, pointer cancel, lost capture, key up, blur, or window focus loss. Ignore repeated keydown events. Restore the processed image without recomputing. Do not add a global shortcut that intercepts input controls.

Bundle five sample images covering portrait, architecture, nature, urban photography, and abstract or geometric artwork. Use images with permission for redistribution, modification, and published derived thumbnails. Record creator, source URL, license, and modifications in an asset attribution document. Credit original assets as original rather than inventing an external source.

Proposed asset budgets are at most 500 KB per sample, approximately 2 MB for all five, and at most 25 KB per gallery thumbnail where visual quality permits. Use optimized JPEG or WebP samples around 1,600 to 2,000 pixels on the long side and separately generated small thumbnails. Load the initial full sample eagerly; fetch other full samples on selection. These are optimization targets, not grounds to degrade visible quality.

Generate all six preset thumbnails from the same urban sample using the actual renderer and final preset values. Store the outputs as bundled assets, not runtime computations. A small developer-only generation command may reuse the production rendering entry point. It is not a visitor-facing feature.

Final brand name, typography choice, exact spacing, palette tuning, licensed asset selection, and thumbnail crops remain design execution details. They must follow the approved direction and be visible in UI screenshots before final approval.

### GitHub repository and delivery workflow

Read-only inspection found no local Git repository and only product documentation. GitHub CLI is installed, but API requests failed in the current environment. Remote repository existence, account identity, and plan eligibility remain unverified. Do not infer that no remote exists from that failure.

After plan approval, inspect authenticated account and available repositories for the proposed project name effect-lab and any intended existing project. If a suitable dedicated repository exists, inspect its content, default branch, visibility, and remotes before connecting. Confirm ownership and resolve any mismatch without overwriting files, replacing remotes, changing visibility, force-pushing, or repurposing an unrelated repository. If the intended owner or repository cannot be determined, request that missing information before mutation.

If no suitable repository exists, create a dedicated private repository with main as the default branch. Initialize local Git without discarding existing documentation. Include a suitable ignore policy for dependencies, build output, coverage, local environment secrets, operating-system files, temporary work, and local agent artifacts. Commit the dependency lockfile and tracked product/specification/asset documentation. Include a README covering local setup, commands, scope, architecture, assets, deployment, and workflow gates.

The initial documentation/bootstrap commit also requires final approval. Establish the reviewed baseline on main without adding unreviewed implementation. Subsequent application changes use dedicated feature branches. Never treat the empty-repository bootstrap as an exception to the commit gate.

After plan and ticket approval and repository verification, create one GitHub Issue per approved ticket in dependency order. Each includes user-visible scope, acceptance criteria, blockers referenced by actual issue numbers, and links to the relevant specification sections. Use native dependencies if available; otherwise explicit issue links suffice. Do not create separate administration issues for repository setup or issue publication. Include setup in the first runnable slice. Record all returned issue URLs and verify creation before reporting success.

Use branches named with issue number and short purpose. Use one Codex implementation agent for this project. Review the spec, propose a brief plan for each ticket, and wait for approval. Implement using TDD at the approved boundaries and run relevant tests and checks. Prepare a concise temporary handoff referencing the spec, issue, branch, comparison base, diff, and evidence for independent review in a fresh Sol session using the existing code-review skill. Address blocking findings before requesting final approval.

The user switches models manually. Prefer Luna for straightforward implementation and Sol for planning, difficult debugging, and independent review. Do not spawn implementation agents or modify global Herdr configuration or skills.

Gate 1 is explicit human plan approval before implementation. Gate 2 is explicit human final approval of the reviewed diff and test evidence before any commit. Only after that approval may commits be pushed and a PR opened. Use the pr skill when drafting PR descriptions, with concrete behavior, issue linkage, specification reference, validation results, and before/after screenshots for relevant UI changes. Stage screenshots locally before the gate and attach them through the authorized GitHub workflow afterward. New revisions following requested changes require final approval again before committing.

No automatic merges. The user merges or separately authorizes a merge of a reviewed PR. Issue closure occurs through the merged PR's closing reference. Ticket approval is not commit approval, and commit approval is not an automatic merge authorization.

### CI and Pages deployment

Use a lightweight GitHub Actions workflow on pull requests and pushes to main. Run one supported Node version on one Linux runner, install reproducibly with npm ci, then run TypeScript checks, linting, Vitest once, and a production build. Fail the job if any required step fails. Do not add a multi-version matrix, paid service, preview deployment service, or redundant coverage threshold.

Build on pull requests without deploying. Deploy only the successful main build artifact through the standard GitHub Pages Actions flow. The deploy job depends on all required checks and uses the GitHub Pages environment, Pages write permission, and OIDC token permission. Other jobs need only read access to repository contents. Use branch restrictions where available and never use pull_request_target to run untrusted change code with write permissions. The official [Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) describes the artifact and deployment requirements.

Prepare deployment configuration but leave publishing disabled until the user separately approves publication and Pages eligibility is confirmed. After that approval, merging approved changes to main triggers deployment automatically. Keep the repository private. Do not push application changes directly to main or enable automatic merging as part of setup.

Use the actual project-repository subpath as the production Vite base. Resolve sample, thumbnail, atlas, worker, and UI asset URLs through Vite imports or its configured base, not hardcoded root paths. No router or custom-domain setup is needed. Smoke-test the production build under the repository subpath before deployment. See the official [Vite Pages deployment guidance](https://vite.dev/guide/static-deploy.html#github-pages).

Private-repository Pages needs an eligible existing GitHub plan. GitHub Free supports Pages for public repositories, as stated in [GitHub's Pages availability documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Do not buy a plan or make the repository public automatically. If the account lacks eligibility, keep development private and leave publication pending a separate visibility decision. Keep the Pages configuration simple and documented regardless of when publication becomes available.

### Feature acceptance criteria

| Feature | Required observable outcome |
|---|---|
| First visit | Without file input or external image API, the urban sample appears with Vintage Dither and correct selected states. Reload restores this state. Initial load failure offers retry. |
| Sample gallery | Exactly five discoverable sample choices cover the agreed subjects. Each selects with one click, preserves settings and preset association, and displays the correct final image. Attributions and bundled files are present. |
| Upload | Valid files at or below 20 MB decode upright, show correct dimensions, and become the one retained upload. A successful replacement removes the old upload. Unsupported, oversize, corrupt, or failed files preserve prior work. |
| Transparency | Original comparison, processing, and PNG export use the same light composite background, including partially transparent regions. |
| Effects | All six process synthetic edge cases without corrupt pixels or dimension changes. Each agreed control changes its documented behavior and works with every source. |
| Presets | Six named fixed thumbnails apply complete definitions to the selected source. Adding a second preset for an existing effect in a test fixture requires no UI/state schema change. |
| Selection and reset | Switching sources preserves values. Effect selection restores its session values and clears preset association. Modified follows parameter equality. Each reset has its distinct behavior and leaves the source unchanged. |
| Preview | Changes schedule automatically, preserve the fitted composition, keep controls usable, show progress, and eventually display only the newest selection. Resize does not alter image-processing decisions. |
| Ordering | Deliberately reordered load, render, progress, error, and encode responses cannot replace newer content, status, retained uploads, or downloads. Queued work remains bounded during rapid input. |
| Comparison | Pointer and keyboard holds show the corresponding original at identical size and location. Every release/cancel/focus-loss path restores processed output. Comparison never appears stuck. |
| Export | PNG signature, MIME, dimensions, opaque pixels, selected source, and selected parameters are correct. Smaller sources are not upscaled. Larger sources respect the provisional cap and displayed notice. Stale exports do not trigger a download. |
| Scale consistency | Glyph/block/dot count and normalized placement agree between preview and export. Dither, threshold, and edge outputs retain their analysis pattern with nearest-neighbor scaling. No claim of byte equality across different dimensions. |
| Recovery | Current processing failures offer retry with retained work; stale failures are ignored. Export failure does not reset image, effect, preset, or values. Worker recovery can reconstruct the session. |
| Desktop UI | At 1280 by 800 and 1440 by 900, the image remains prominent, sidebars remain usable, and controls/export are reachable without overlap. Keyboard focus and labeled controls work. Review screenshots in supported browsers. |
| Resource lifecycle | Parameter edits do not decode the image. Repeated source/upload/export changes do not accumulate URLs, bitmaps, workers, or old queued jobs. Teardown releases resources. |
| Static hosting | The built tool works under the repository subpath with no missing samples, thumbnails, worker, atlas, or UI assets. Editing makes no backend or image-service requests. |
| GitHub workflow | The dedicated repository remains private initially with main as default, no existing remote is overwritten, approved issues link to branches/PRs, CI runs on PR/main, and only eligible successful main builds deploy. Human gates are honored. |

## Testing decisions

### Proposed test boundaries

There is no existing application or test prior art. Prefer a single public render-request/result contract for renderer integration tests. Supply a source fixture, effect parameters, and target dimensions, then assert observable image output and completion behavior. Keep worker transport replaceable in tests so responses can be delayed or reordered without mocking pixel algorithms.

Pure algorithm tests are also required by the approved quality goal. Exercise the effect processor's pixel or cell-plan input/output, not its internal helpers. Test session transitions through user actions and resulting state because reset/preset semantics are separate observable behavior. These limited boundaries are proposed for plan review, not an invitation to add interfaces to every helper.

Use Vitest for numerical processing, definition validation, sizing policy, session transitions, and controller races. Use browser verification for real decoding, Canvas drawing, worker transfers, PNG encoding, comparison, download behavior, and production subpath loading. A passing mock-based test is not evidence of real browser support. Add no browser-test dependency unless it materially improves repeatable verification and is included in the approved ticket.

### Numerical and algorithm fixtures

- Use tiny hand-checkable opaque fixtures, gradients, flat fields, impulses, known corners, one-pixel images, and non-square dimensions. Verify output dimensions, alpha, deterministic behavior, and input immutability.
- ASCII tests check ramp ordering, expected glyph choices for white/black fields, contrast effects, cell counts, aspect ratio, and partial-cell handling. Browser checks verify atlas rendering and visible character quality at maximum export size.
- Pixelation tests check exact block averages on a small fixture, partial blocks, quantization endpoints, maximum color count, and normalized block boundaries at two output sizes.
- Dither tests compare a small hand-calculated binary pattern with known diffusion results. Verify boundaries, palette-only output, uniform black/white behavior, and identical results across different cooperative batch sizes.
- Halftone tests check zero and maximum radii, square-root area response, contrast effects, cell counts, and normalized placement. Browser checks verify dots remain circular and clean at output edges.
- Edge tests check a uniform field has no contours, known vertical/horizontal boundaries produce edges, higher sensitivity includes weaker contours, inversion swaps roles, and border pixels remain valid.
- Threshold tests check values immediately below, equal to, and above cutoff, both cutoff endpoints, inversion, and palette-only output.
- Test texture geometry using the same source at analysis-size and export-size targets. Assert equal logical grids and proportional geometry before integer rasterization. Compare nearest-neighbor raster output after applying the documented sizing policy. Do not require antialiased edge bytes to be identical across browsers.

### State, asynchronous behavior, and export tests

- Validate every preset against its effect schema, every reference against registries, and unique IDs. Include a second preset for one effect as a test-only fixture.
- Exercise the full sequence of applying a preset, editing it, changing sources, switching effects, returning, resetting the effect, and resetting a preset. Assert the source never changes because of settings actions.
- Test successful replacement and failed upload retention, exact byte-limit boundary, format validation, orientation, and transparent compositing using real browser fixtures where APIs are needed.
- Delay render A, request B, complete B, then complete A. Repeat across different effects and sources, errors, progress, retries, worker recreation, and uploads. Verify only B can publish.
- Change settings during export rendering and again during delayed encoding. Assert no stale Blob can trigger download. Fail encoding and verify retry eligibility without state loss.
- Test dimensions below, at, and above the cap, panoramic/portrait shapes, one-pixel dimensions, and rounding bounds. Decode an exported PNG in a browser and check its dimensions and representative pixels, rather than inspecting a mocked download callback alone.
- Check pointer cancellation and focus loss as well as ordinary pointer/key release. Verify keyboard comparison does not interfere with sliders or scroll through Space while its button is held.

### Browser, performance, and delivery verification

Run the production build in each claimed desktop engine at release and capture evidence for startup, sample switching, upload, all six presets, control changes, comparison, export, and failure recovery. Test both desktop acceptance sizes and the repository subpath. Test the actual worker and PNG output, not only the development server.

Measure a sustained slider drag and rapid source/preset changes using a documented representative desktop and all samples. Start with a target of at most 200 ms for the latest settled preview on that machine and no effect-processing long tasks on the main thread. Treat this as a measured engineering target, not a guarantee on every device. Record source sizes, effect, browser, hardware, and timings. If a target fails, optimize within scope or explicitly review a performance-policy adjustment.

Measure an export near 12 megapixels, confirm the UI remains responsive, and verify cancellation/error paths and cleanup. Do not promise a fixed export latency before measurement. Inspect memory/resource trends after repeated uploads and downloads, with no retained history.

Required checks before each final approval are TypeScript, lint, relevant Vitest tests, production build, diff review, and browser evidence appropriate to the slice. For the final release, run the complete suite and all feature acceptance flows. Do not enforce coverage percentages or repeat unrelated tests after all checks pass without a new reason.

CI must demonstrate that a failing required check prevents deployment and that PR builds cannot deploy. Review workflow permissions and main-only conditions. After an authorized first publication, open the actual Pages URL and repeat the core smoke flow.

## Out of scope

- Mobile-specific layouts or a mobile editing quality commitment.
- Effect chains, additional effect families, user-authored presets, custom palettes, and custom glyph sets.
- Dynamic preset thumbnails, multiple retained uploads, URL image imports, drag-and-drop requirements, and image-library management.
- Saved sessions, persistence, undo/redo, share links, accounts, databases, cloud processing, and preset sharing.
- Draggable before/after comparison, manual zoom, panning, cropping, resizing controls, and image editing beyond the six effects.
- ASCII text export, animation playback/export, SVG or HEIC support, transparent exports, metadata retention, and full color-management guarantees.
- GPU/WebGL/WebGPU processing, worker pools, plugin frameworks, render graphs, and legacy-browser fallback engines.
- Paid infrastructure, purchased GitHub plan upgrades, custom domains, PR preview hosting, automatic merges, and repository visibility changes without separate approval.

## Further notes

The approved product decisions remain the source of product scope. This specification adds technical contracts and proposed verification details without changing the six-effect desktop experience.

Unresolved external prerequisites are authenticated GitHub access, intended owner and repository existence, and private-repository Pages eligibility. They block remote setup or publication, not specification review. Resolve them with read-only checks first. A visibility change, if needed, requires a separate user decision.

The fixed analysis-grid approach, initial parameter values, test boundaries, and lightweight worker design are approved technical decisions. Analysis/output limits and visual defaults may be tuned after evidence, with any behavioral or scope change brought back for approval.

Next steps are repository verification/setup, publication of the ten approved GitHub Issues, and approval of Ticket 1's brief implementation plan. Use the single-agent project workflow. Keep final approval before commits, pushes, PR creation, or merges, and separate publication approval before enabling Pages.
