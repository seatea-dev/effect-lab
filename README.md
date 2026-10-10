# Imprint

A browser-based digital print studio and personal portfolio project.

Ticket 1 provides one bundled city photograph, Threshold processing, the Ink preset, cutoff/inversion controls, separate reset actions, a live preview, and PNG export. Other effects, the five-image gallery, uploads, and comparison arrive in later approved tickets. Nothing is published yet.

## Run locally

Use Node 24 or newer and npm. Node 24 is the CI baseline.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/effect-lab/`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

The production preview also lives at `/effect-lab/`. No environment variables, API keys, accounts, or backend are needed.

## Architecture

- `src/effects` contains deterministic pixel processing.
- `src/definitions` contains effects, preset values, palette colors, and sample metadata.
- `src/session` contains source-preserving parameter and reset transitions.
- `src/rendering` contains sizing policy, the worker protocol, one rendering controller, and the image worker.
- `src/ui` contains the desktop workspace and its React binding.

The worker prepares a source once, using a maximum 1200-pixel analysis edge. Preview and PNG export use the same processed analysis raster. Export scales its discrete marks with nearest-neighbor sampling, preserving the pattern at the source dimensions within a provisional 12-megapixel cap. It does not add photographic detail beyond the analysis image.

The controller allows one running request and one replaceable pending preview. Setting changes invalidate running results synchronously. The worker yields between row batches, and both sides reject results from obsolete revisions or requests. PNG results receive the same checks after encoding and before download. There is no worker pool, render graph, or persistent cache.

The application needs module workers, bitmap decoding, and OffscreenCanvas 2D/PNG support. A startup handshake checks the worker's actual capabilities. Unsupported environments show a recoverable explanation. Only browsers actually tested should be claimed as verified.

The sample and asset licenses are documented in [asset credits](docs/assets.md). Product scope is in [product decisions](docs/product-decisions.md); technical contracts and acceptance criteria are in [the specification](docs/spec.md).

## Tests and review

Vitest tests the effect processor, session actions, sizing policy, and render-request/result boundary. Transport tests reorder responses without mocking the pixel algorithm. Real-browser verification must cover the worker, actual decoded PNG pixels/dimensions, error recovery, and production subpath assets. A mock transport test alone does not establish browser compatibility.

Use one implementation agent and an issue-linked feature branch. Obtain approval of each ticket's brief plan before implementation. Use TDD at approved boundaries, run checks, and prepare a temporary handoff for independent code review in a fresh Sol session. Address blockers before final approval. The user switches models manually.

Do not commit, push, create a PR, merge, or publish without the applicable final approval. Do not change global Herdr configuration or skills. Ignore rules do not remove already tracked planning artifacts from Git.

## CI and deployment

GitHub Actions runs typecheck, lint, Vitest, and the production build on PRs and pushes to main. The Pages artifact step and deployment job are explicitly disabled with `if: ${{ false }}`. Repository setup does not authorize publication.

After separate publication approval and confirmation of private-repository Pages eligibility:

1. Configure GitHub Pages to use GitHub Actions and the `github-pages` environment for main.
2. Replace both disabled conditions with `github.event_name == 'push' && github.ref == 'refs/heads/main'` inside a GitHub expression.
3. Review and approve that change before committing or merging. The deploy job uses the successful checked build, and PRs cannot publish.

Vite uses `/effect-lab/` as its base. Asset imports and the worker URL follow that base. Keep the repository private; do not purchase services or change visibility automatically.
