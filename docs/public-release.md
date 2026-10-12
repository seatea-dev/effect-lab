# Imprint public-release preparation

## Scope and approvals

All ten development tickets are merged into main. Release preparation starts at `500311c`. The repository name remains `effect-lab`, and Vite retains `/effect-lab/`. The application title and visible wordmark already use Imprint. This branch updates the page description, README, documentation privacy, and deployment conditions without changing effects or UI layout.

The owner approved preserving development history, including historical authorship and nonsensitive local paths. Current documentation removes unnecessary absolute paths. Issues, pull requests, and ticket records remain intact.

Independent Sol review is the next gate. Commit, push, PR creation, merge, visibility changes, Pages enablement, and publication each still require the owner's explicit approval.

## Deployment configuration

The existing Checks workflow still runs installation, typecheck, lint, Vitest, and the production build on pull requests and main pushes. It also supports a manual run for the first authorized deployment.

Artifact upload and deployment require every condition below:

- The repository variable `IMPRINT_PAGES_ENABLED` equals the string `true`.
- The repository is public.
- The workflow runs on `refs/heads/main`.
- The event is a push or a manual workflow run.
- Required checks pass. Deployment depends on the checks job and uses its `dist` artifact.

The variable is absent or disabled during preparation. A pull request, private repository, non-main branch, disabled variable, or failed check cannot deploy. Workflow jobs default to read-only repository contents. Only the deploy job gets Pages write and OIDC token permissions. The workflow uses official GitHub actions and does not create a gh-pages branch.

## Steps after publication approval

Do not perform these steps until publication is explicitly approved:

1. Obtain approval for the reviewed commit, push, PR, and merge. Merge this branch through the approved workflow while the publication variable remains disabled.
2. In repository Settings, General, Danger Zone, change visibility to public. Review GitHub's visibility-change notice before confirming.
3. In Settings, Pages, select GitHub Actions as the build and deployment source.
4. In Settings, Environments, configure `github-pages` to accept deployments only from main. Review any environment protection rules. Do not add production credentials.
5. In Settings, Secrets and variables, Actions, Variables, create the repository variable `IMPRINT_PAGES_ENABLED` with value `true`.
6. In Actions, select Checks, Run workflow, and choose main. All checks must pass before the first deployment. Later approved merges to main update the site automatically.
7. Open `https://seatea-dev.github.io/effect-lab/` and verify assets, worker startup, source selection, comparison, and an actual PNG download. Update the README's pending-demo wording only after confirming the live URL.

To pause future deployments, set `IMPRINT_PAGES_ENABLED` to `false`. This stops workflow publication but does not remove a site that has already been published.

GitHub Free supports Pages for public repositories. See GitHub's [Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Future commit privacy

Use the exact noreply address shown in GitHub Settings, Emails, with Keep my email addresses private enabled. For this account the ID-based form is `333176669+seatea-dev@users.noreply.github.com`; confirm it in Settings before use.

Set it only for this repository when ready:

```sh
git config --local user.email "333176669+seatea-dev@users.noreply.github.com"
git var GIT_AUTHOR_IDENT
```

These commands are recommendations, not changes made during preparation. They affect future commits only. Historical author names and emails remain unchanged. GitHub's option to block command-line pushes that expose a private email provides another check.

## License decision

There is no application source-code license in the repository. No license was added. Before inviting code reuse, the owner must choose and approve a license. Public visibility and deployment do not require changing the existing asset license terms. Image and glyph attribution stays in [assets.md](assets.md).

## Verification record

Preparation results and remaining limits are recorded in [public-release-verification.md](public-release-verification.md). They do not authorize publication.
