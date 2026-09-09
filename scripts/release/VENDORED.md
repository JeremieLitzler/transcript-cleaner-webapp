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

## How CI runs it

`release-bash.yml` runs it `--yes` in two modes — a dry-run **preview** on every push to `develop`, a **publish** on a pushed `release/<date>` branch — both on the default `GITHUB_TOKEN`, and the publish job adds two preflight guards the script does not carry (issues #63, #64). The wiring, the guards, and why the plain token suffices are in `release-bash.yml` and `docs/agents/ci.md`.

## Syncing a deliberate update

1. Diff the upstream file at the new commit against this copy before touching anything: `gh api repos/JeremieLitzler/semantic-release-script-testing/contents/release.sh?ref=<new-commit> --jq '.content' | base64 -d`
2. Review the diff line by line. This script runs unattended (`--yes`) in publish mode — it pushes a tag and creates a release — so an unreviewed change is a direct risk.
3. Replace `release.sh` with the new content, then re-apply the branch-check hunk from _Local modifications_ (or fold in whatever upstream now does there).
4. Update the **Pinned commit** and **Vendored on** fields above.
5. Exercise it in preview mode — a push to `develop` — before relying on it for a publish.

Do not track the upstream default branch automatically — no submodule, no fetch-at-CI-time. Every sync here is a deliberate, reviewed commit.
