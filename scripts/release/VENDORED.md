# Vendored: `release.sh`

`release.sh` in this directory is a vendored copy of an external script, kept byte-for-byte apart from one small local change recorded under _Local modifications_ below. It is not an npm or git submodule dependency — it is committed directly so `.github/workflows/release-bash.yml` runs a reviewed, pinned version rather than tracking the upstream default branch.

- **Source repository**: https://github.com/JeremieLitzler/semantic-release-script-testing
- **Source file**: `release.sh`
- **Pinned commit**: `de0a43a7790f509371219087c10602a0f8c39bb9`
- **Vendored on**: 2026-09-03

Verified byte-for-byte against the upstream file at that commit, and against the copy already vendored in `french-gas-stations-scraper`. At the time of vendoring, the pinned commit was also the head of the upstream default branch. It has since taken the one hunk below.

## Local modifications

One change, made when the release pipeline moved to a single `develop` trunk (issue #54). Upstream warns when it is not run from `main`:

```sh
[[ $CURRENT_BRANCH == "main" ]] || warn "you are on '${CURRENT_BRANCH}', not 'main'"
```

This repo has no `main`, so that is replaced with a `case` that accepts `develop`, a `release/*` branch, and a detached `HEAD` (how CI checks the ref out), and warns for anything else. It only changes a non-fatal stderr message — the CI runs are `--yes` and never read it — so a sync that reverts it costs nothing but the local guidance; re-apply it rather than carry upstream's `main`-only line.

## What it needs from the environment

`git`, `bash` 4 or newer, and the GitHub CLI already authenticated — all present on `ubuntu-latest`. It resolves the repository itself via `gh repo view`, so nothing in it is specific to any one project.

The script's `gate()` prompts call `die` in any environment with no TTY, so **both** CI modes pass `--yes`. `--dry-run` skips the destructive remote steps (tag push, release publish) but not the gates, which is why `--yes` is needed even in preview.

## What this repository wires around it

`release-bash.yml` runs the script in two unattended (`--yes`) modes on a single `develop` trunk:

1. **Preview** — every push to `develop`. `release.sh --dry-run` on the default `GITHUB_TOKEN`; pushes nothing, writes the pending version and notes to the run summary.
2. **Publish** — a pushed `release/<date>` branch (or a `workflow_dispatch` with `mode=publish`). `release.sh --yes` on the same `GITHUB_TOKEN` with `contents: write`: it tags the branch's commit and creates the GitHub release.

The publish job wraps the script with two guards the script itself does not carry (issues #63, #64):

- It fails unless the checked-out ref is contained in `origin/develop`, so a commit added on `release/<date>` before the push cannot land the tag on a commit `develop` lacks (#64).
- Before running the script it looks for an annotated `vX.Y.Z` tag sitting on `HEAD` that is on the remote but has no GitHub release — the state an earlier run leaves when it dies between `git push <tag>` and `gh release create`. It deletes that tag (remote and local) so the normal run below re-cuts and re-publishes it with the same notes, instead of the script dying on the re-push (either `no commit to release in range`, the tag now being on `HEAD`, or `tag <v> already exists locally`). #63 lists deleting the tag as an accepted manual recovery; this only automates it, and only for the plain re-push where the orphaned tag is on `HEAD` — a re-cut `release/<date>` with new commits past the orphaned tag is still a manual fix.

No GitHub App, no extra secrets. The `protect-main` ruleset is deleted and nothing protects the tag ref (issues #54–#57), so the plain token is enough. If a workflow that triggers on `push: tags` or `release` is ever added, a token that can trigger further workflows — a GitHub App or a PAT — has to come back for the publish job, because `GITHUB_TOKEN` deliberately cannot.

## The first release

With no tags, `release.sh` read the entire history as its range and started from `0.0.0`; the `feat:` commits made the first release **`v0.1.0`**. Nothing needed seeding.

## Syncing a deliberate update

1. Diff the upstream file at the new commit against this copy before touching anything: `gh api repos/JeremieLitzler/semantic-release-script-testing/contents/release.sh?ref=<new-commit> --jq '.content' | base64 -d`
2. Review the diff line by line. This script runs unattended (`--yes`) in publish mode — it pushes a tag and creates a release — so an unreviewed change is a direct risk.
3. Replace `release.sh` with the new content, then re-apply the branch-check hunk from _Local modifications_ (or fold in whatever upstream now does there).
4. Update the **Pinned commit** and **Vendored on** fields above.
5. Exercise it in preview mode — a push to `develop` — before relying on it for a publish.

Do not track the upstream default branch automatically — no submodule, no fetch-at-CI-time. Every sync here is a deliberate, reviewed commit.
