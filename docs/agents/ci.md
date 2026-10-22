# CI and releases

Operational notes for working on `.github/workflows/`. The settled decisions and their rationale live in `CONTEXT.md` (CI, Deploy, Releases, Branch model); this file is the how-to and the gotchas that cost time to rediscover.

## Changing the release pipeline

`release.sh` is not in this repo: `release.yml` downloads it from `JeremieLitzler/semantic-release-script` at the SHA in `RELEASE_SCRIPT_REF` (tag `v1.0.0`), so a commit cannot change the script that releases it. To add or change pipeline behaviour — a guard, a preflight check, a recovery path — add a step or job in `release.yml`, around the script. To move the pin: take the SHA of the script repo's `main` or of a version tag (`git rev-parse 'vX.Y.Z^{commit}'`), set `RELEASE_SCRIPT_REF` to it, and merge; the next push to `develop` previews the pending release with the new script before anything is published.

The publish job already wraps the script with two preflight guards: the pushed `release/*` ref must be contained in `origin/develop`, and an orphaned tag from a half-finished run is deleted so the release re-cuts. A `guard` job refuses any other ref, and the `check` and `build` jobs (each `npm ci` and `npm audit signatures`, then `npm run check` or `npm run build`) must pass before `publish` starts. A `deploy-site` job calls `NETLIFY_BUILD_HOOK` after a release is cut.

## Cutting a release

A release is cut by pushing a `release/<date>` branch off the tip of `develop` — not by a pull request, and not from `develop` itself (a push to `develop` only ever runs the dry-run preview to the run summary). The `release/*` push runs the `publish` job, which tags that commit and creates the GitHub release. A `workflow_dispatch` run with `mode=publish` does the same from `develop` or a `release/*` branch.

The release branch is disposable: it carries nothing to merge back, and once the `publish` job has tagged and released, its final step deletes the `release/*` branch from `origin`. Cut a fresh `release/<date>` for the next release rather than reusing one. A `workflow_dispatch` publish never deletes its ref, and a failed publish leaves the branch in place for a retry.

## GITHUB_TOKEN and downstream workflows

The publish job tags and releases with the default `GITHUB_TOKEN`, which by design does not trigger further workflow runs. Before adding a workflow that keys on `on: release` or `on: push: tags` (npm publish, a deploy, changelog sync), note that `release.yml`'s `publish` job authenticates with `GITHUB_TOKEN` — swap in a GitHub App or PAT token there for the release to be visible to that workflow.

## Rulesets

The `protect-develop` ruleset targets `refs/heads/develop` only, so `release/**` pushes are not gated by it. It permits rebase-merges only and blocks force-push and deletion; there is no `protect-main` any more.

Changing a ruleset's enforcement is 2FA-gated. A CLI or agent token cannot flip it — the API call fails silently and leaves enforcement unchanged. Hand that step to the user to do in the repo's **Settings > Rules** UI.
