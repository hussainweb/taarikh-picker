## Beads

This project tracks its work with beads (`bd`). Before doing anything with issues, read the
`beads` skill at `.agents/skills/beads/SKILL.md` and follow it; it begins with `bd prime`,
which prints the current commands, the session-close protocol and this project's persistent
memories. Track tasks in beads, not in TODO lists, plan files or memory files.

---

<!-- fallow:setup-hooks:start -->

## Fallow checks

Use fallow for code-quality, cleanup, and setup tasks in this repository. Fallow checks the changed code before each `git commit` and `git push`. In Claude Code and Codex, a PreToolUse hook from `fallow agent install` runs this check and blocks the command when the verdict is `fail`. Other agents run the check themselves: `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before you try again. A JSON runtime error such as `{ "error": true, ... }` does not block.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to...                                        | Run                                                                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| delete an "unused" export or file                                    | `fallow dead-code --trace <file>:<export>`                                                                                                                    |
| prove a TypeScript symbol's exact consumers before refactoring       | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>`                                                                               |
| find how one module reaches another                                  | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.)       |
| delete an "unused" dependency                                        | `fallow dead-code --trace-dependency <name>`                                                                                                                  |
| migrate a dependency                                                 | `fallow trace --dependency <name> --sites` (Counts each imported name, follows one hop through project wrappers, and counts each use that it cannot resolve.) |
| commit or open a PR                                                  | `fallow audit --base <ref>`                                                                                                                                   |
| read a diff before approving it                                      | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row)                                        |
| prioritize refactoring                                               | `fallow health --hotspots --targets`                                                                                                                          |
| ask who owns code                                                    | `fallow health --ownership`                                                                                                                                   |
| check untested-but-reachable code                                    | `fallow health --coverage-gaps`                                                                                                                               |
| consolidate duplication                                              | `fallow dupes --trace dup:<fingerprint>`                                                                                                                      |
| find feature flags                                                   | `fallow flags`                                                                                                                                                |
| check which architecture rules apply to a file before changing it    | `fallow guard <files>`                                                                                                                                        |
| check import cycles, boundaries and policy rules after changing code | `fallow architecture`                                                                                                                                         |
| surface security candidates                                          | `fallow security`                                                                                                                                             |
| understand a finding                                                 | `fallow explain <issue-type>`                                                                                                                                 |
| scope a monorepo                                                     | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command)                                                                          |

<!-- fallow:setup-hooks:end -->

---

## Releases & Tagging

Releases are published to **both** npm (`@taarikh/picker`) and Packagist (`hussainweb/taarikh-picker`).

### Dual Distribution Contract

- On `main`, compiled assets in `dist/` are intentionally gitignored.
- For Drupal sites installing via Composer / Packagist, the git release tag must contain compiled assets so Drupal can load `libraries/taarikh-picker/dist/index.js` without requiring Node.js or a build step.
- **Never create or push a release tag directly on `main` without `dist/`**. Always use the automated release workflow.

### When to Initiate a Release

An agent should suggest or initiate a release when:

1. A release milestone, task, or epic is marked complete.
2. Features, fixes, or breaking changes have landed on `main` and all quality gates (`npm run ci`) pass.
3. Explicit user instruction or approval is given to cut a release.

### Release Workflow Steps

Releases are automated through [`.github/workflows/release.yml`](.github/workflows/release.yml):

1. **Verify Quality Gates**:
   Ensure all checks pass locally and in CI:

   ```bash
   npm run ci
   ```

2. **Trigger the Release Workflow**:
   Trigger the workflow with the target semver (omit the leading `v`):

   ```bash
   gh workflow run release.yml -f version=<semver>
   ```

   _(e.g., `gh workflow run release.yml -f version=0.2.0`)_

3. **What the Workflow Executes Automatically**:
   - Runs full quality checks (`npm run check`, `npm test`, `npm run typecheck`).
   - Updates version in `package.json` and compiles fresh `dist/` assets (`npm run build`).
   - Validates package integrity (`publint`, `attw --pack`, `size-limit`).
   - Checks out detached HEAD, force-adds `dist/`, and commits the release assets.
   - Creates and pushes git tag `v<version>`.
   - Creates a GitHub Release with auto-generated release notes.
   - Publishes to npm using OIDC Trusted Publishing with provenance (`--provenance --access public`).

4. **Monitor and Verify**:
   - Watch the workflow run:
     ```bash
     gh run list --workflow=release.yml --limit 1
     gh run watch <run-id>
     ```
   - Verify GitHub release: `gh release view v<version>`
   - Verify npm: `npm view @taarikh/picker version`
