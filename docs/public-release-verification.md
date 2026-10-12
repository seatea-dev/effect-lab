# Public-release preparation verification

## Review boundary

Branch: `feature/imprint-public-release`. Base: `500311caca3f37d4863157ea15478618a0a48744`. Main was synchronized and clean before the branch was created. All ten development tickets are merged and closed. This preparation changes documentation, page description, and CI publication conditions. Effect algorithms, presets, worker code, dependency manifests, and sizing policies are unchanged.

This is implementation verification and self-review evidence. It does not replace independent Sol review or authorize a commit, push, PR, merge, visibility change, Pages enablement, or publication.

## Security and privacy

- Gitleaks 8.30.1 was downloaded from its official release and its archive SHA-256 checked against the published checksum. Its default rules found no leaks in reachable Git history with `--log-opts=--all`, the exported current release files, or `dist`. No suppression or custom allowlist was added. The history scan covered 13 content commits; the graph contains 23 commits including merges.
- The initial targeted audit examined 170 text blobs and commit metadata. No provider credential, private-key, credential-URL, or assigned-secret matches were found. No environment-secret files appeared in reachable history.
- All 20 existing issue and PR descriptions were checked for credential patterns, personal paths, and email addresses. No matches were found. The issue and review-comment endpoints returned no comments.
- `npm audit` reported zero known vulnerabilities. Dependencies were not changed.
- Historical Git author email and nonsensitive local paths remain intact with the owner's explicit approval. Current Markdown documentation removes machine-specific usernames and absolute local paths. Generalized artifact labels preserve the historical verification records without claiming the temporary files are bundled.
- The production bundle contains only HTML, JavaScript, CSS, and imported image assets. It has no documentation, local environment files, workflow files, source maps, or dotfiles. Gitleaks found no bundle secrets.
- No application license was added. Future noreply commit-email recommendations are in [public-release.md](public-release.md). Git email configuration was not changed.

These scans are evidence, not a guarantee that every possible secret is absent. Remote unreachable objects, unavailable private attachments, and masked GitHub secret values were not audited. No secret values or repository settings were changed.

## Quality checks

| Check | Result |
| --- | --- |
| Typecheck | Passed |
| Lint | Passed |
| Full Vitest suite | 125 tests passed across 13 files |
| Production build | Passed under `/effect-lab/` |
| Gallery browser regression | Passed at 1440 × 900, 1280 × 800, and 1100 × 800 |
| Live-region browser regression | Passed |
| `git diff --check` | Passed |
| actionlint 1.7.12 | Passed; shellcheck and pyflakes integrations disabled |
| Publication condition matrix | 54 cases passed |

The condition matrix evaluated both workflow guards across gate values, visibility, refs, and event types. Only public, explicitly enabled main pushes or manual main runs qualify. The deploy job depends on checks. This was local condition validation, not an actual GitHub deployment or a live failing-check experiment.

## Production Chrome verification

Chrome 154.0.8037.99 loaded the built application at `/effect-lab/` through a local production preview.

- All five sources and all six presets rendered with the real worker. Direct effect selection and parameter changes passed. Selected sources survived preset and settings actions.
- Modified, Reset Preset, Reset Effect, and per-effect settings retention passed.
- Real pointer input reached all six cards at the three documented desktop sizes. Screenshots and layout checks showed a visible preview, scrollable sidebars, and no horizontal overflow.
- Transparent and replacement uploads worked. Corrupt uploads retained the accepted source and settings.
- Pointer holds, movement outside the control, release outside, cancellation, capture loss, Space/Enter holds, real key repeats, blur, and visibility loss restored the processed image. Comparison sent no new worker requests.
- A newer source became usable while an obsolete response remained unresolved. Worker failure and retry restored usable work. All 18 transferred preview pairs observed in the instrumented comparison run closed after painting.
- Export during comparison matched processed pixels exactly and remained opaque. A 4000 × 3000 PNG retained its dimensions. A 4200 × 3000 upload exported at the displayed 4098 × 2927 dimensions, with a downscale notice and no transparent pixels. Source changes canceled an in-flight export without downloading a stale result.
- Focus visibility and reduced-motion checks passed. The audit recorded no page exceptions, failed requests, or HTTP error responses. Bundled samples, thumbnails, glyph atlas, CSS, JavaScript, and the worker loaded under the repository subpath.

The full audit also checked upload/download URL cleanup and worker retry disposal. These checks do not establish a sustained heap-memory guarantee or verified support for another engine.

## README screenshot

The screenshot is an actual 1600 × 1000 Chrome production view with Vintage Dither applied to the urban sample. It includes the controls, source strip, comparison button, export, and preset gallery. Chrome encoded the screenshot as a 322,118-byte WebP at quality 0.9, compared with a 1,158,327-byte PNG capture. The final WebP was visually inspected.

File: [screenshots/imprint-preview.webp](screenshots/imprint-preview.webp). The photograph's attribution remains in [assets.md](assets.md).

## Publication state and remaining decisions

The repository remains private. GitHub reports no Pages site, and no `IMPRINT_PAGES_ENABLED` repository variable exists. No publication occurred. The planned URL is `https://seatea-dev.github.io/effect-lab/`; it has not been verified live. The README marks the link as pending publication.

Chrome is the only independently verified browser. Safari, Edge, and Firefox remain unverified. The 1100-pixel desktop minimum and 12-megapixel cap remain. Blueprint and Newsprint's recorded performance overages relative to the 200 ms engineering target remain documented in the README and Ticket 10 record; preparation did not optimize processing or change that policy.

Independent Sol review is pending. After review, the owner must separately authorize repository operations and publication. The application license remains an owner decision. Live URL verification and any remote workflow checks must follow the applicable approval gates.
