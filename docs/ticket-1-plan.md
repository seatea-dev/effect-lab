# Ticket 1 implementation plan

Status: pending human approval. No application code has been written.

## Outcome

A runnable desktop workspace processes one bundled sample with Threshold and the Ink preset, exposes cutoff and inversion controls, and downloads a correctly sized PNG. This is a narrow first slice, not the completed six-effect interface.

## Prerequisites

Local Git initialization is complete. The branch is main, there are no commits, and origin points to https://github.com/seatea-dev/effect-lab.git. Verify remote privacy and publish the approved issues before recording Ticket 1's actual number. GitHub API access still fails in this environment, so remote verification and issue publication remain pending. The approved issue bodies are prepared locally under .scratch/effect-playground/issues.

Use main as the initial local branch and an issue-linked feature branch for the implementation. An empty repository has no committed comparison base. Do not manufacture one by committing without approval. Present the initial file set and diff for review; the first baseline commit requires separate final approval. Subsequent slices compare against approved main.

## Work sequence

1. Set up React, TypeScript, Vite, Tailwind, Lucide, Vitest, npm scripts, linting, ignore rules, README, and lockfile. Choose compatible stable versions and record the Node requirement. Preserve existing documentation.
2. Establish the effect/preset definitions, small session reducer, render request/result contract, and single worker controller. Implement only Threshold and Ink initially. Use the approved revision/request checks and bounded scheduling policy rather than a general rendering framework.
3. Work through red/green cycles for threshold output, sizing, session actions, and stale-result rejection. Prepare one attributed sample, opaque background compositing, cached analysis data, and preview rendering. Add the fitted three-column shell with cutoff, inversion, numeric values, resets, dimensions, and processing/error feedback.
4. Add PNG export using the shared analysis result, provisional 12-megapixel policy, dimension notices, encoding/download validity checks, and resource cleanup. Verify that setting changes during encoding prevent a stale download.
5. Add lightweight PR/main CI for typecheck, lint, tests, and build. Prepare repository-base-aware Pages configuration, disabled pending publication approval. Do not enable Pages or publish the application.
6. Run checks and real-browser smoke tests for rendering, parameter changes, retry, PNG dimensions/content, subpath assets, and disposal. Save screenshots and evidence. Prepare a temporary handoff for independent review in a fresh Sol session, address blockers, and request final approval before committing, pushing, or creating a PR.

## Approved test boundaries

- Effect processor input/output for hand-checkable threshold, cutoff equality, inversion, dimensions, opacity, and input immutability.
- Render request/result contract for sizing and ordering. Delay/reorder completion and encoding at the transport boundary without mocking the pixel algorithm.
- Session actions and observable state for image-preserving settings/reset transitions.
- Real browser verification for worker capabilities, Canvas rendering, image preparation, PNG encoding/download, and cleanup.

These boundaries were approved in the specification. Use one failing behavior test and its minimal implementation per TDD cycle. No tests against private helpers, package templates, or the appearance of internal messages.

## Completion evidence

Typecheck, lint, relevant Vitest tests, production build, browser smoke results, actual exported PNG checks, screenshots, and an independent review with no blocking findings. Application checks cannot run until implementation exists. Repository setup and issue publication must be reported separately from local test results.
