# Vendored: `release.sh`

`release.sh` in this directory is a vendored, unmodified copy of an external script. It is not an npm or git submodule dependency — it is committed directly so `.github/workflows/release-bash.yml` runs a reviewed, pinned version rather than tracking the upstream default branch.

- **Source repository**: https://github.com/JeremieLitzler/semantic-release-script-testing
- **Source file**: `release.sh`
- **Pinned commit**: `de0a43a7790f509371219087c10602a0f8c39bb9`
- **Vendored on**: 2026-09-03

Verified byte-for-byte against the upstream file at that commit, and against the copy already vendored in `french-gas-stations-scraper`. At the time of vendoring, the pinned commit was also the head of the upstream default branch.

## What it needs from the environment

`git`, `bash` 4 or newer, and the GitHub CLI already authenticated — all present on `ubuntu-latest`. It resolves the repository itself via `gh repo view`, so nothing in it is specific to any one project.

The script's `gate()` prompts call `die` in any environment with no TTY, so **both** CI modes pass `--yes`. `--dry-run` skips the destructive remote steps (tag push, release publish) but not the gates, which is why `--yes` is needed even in preview.

## Setup this repository still needs

Preview mode works as-is: it runs on the default `GITHUB_TOKEN` and pushes nothing. Publish mode does not, and will fail until all of the following exist:

1. **A `develop` branch**, and pull requests retargeted at it. The workflow only acts on `develop` > `main`.
2. **A GitHub App** installed on this repository with contents write permission, and its credentials as the repository secrets `GH_APP_ID` and `GH_APP_KEY`. The default `GITHUB_TOKEN` cannot push a tag to a protected `main`.
3. **Branch protection on `main`** — otherwise the App is solving a problem the repository does not have, and the plain token would do.

Until step 2 is done, a merge of `develop` into `main` will run the publish job and fail at the token step. That is a visible failure rather than a silent one, which is the intended shape.

## The first release

There are no tags yet, so `release.sh` reads the entire history as its range and starts from `0.0.0`. The branch carries `feat:` commits, so the first release will be **`v0.1.0`**. Nothing needs seeding.

## Syncing a deliberate update

1. Diff the upstream file at the new commit against this copy before touching anything: `gh api repos/JeremieLitzler/semantic-release-script-testing/contents/release.sh?ref=<new-commit> --jq '.content' | base64 -d`
2. Review the diff line by line. This script runs unattended (`--yes`) against a protected branch in publish mode, so an unreviewed change is a direct risk.
3. Replace `release.sh` with the new content, unmodified.
4. Update the **Pinned commit** and **Vendored on** fields above.
5. Exercise it in preview mode on a real pull request before relying on it for a publish.

Do not track the upstream default branch automatically — no submodule, no fetch-at-CI-time. Every sync here is a deliberate, reviewed commit.
