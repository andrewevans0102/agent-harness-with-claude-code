# Harness Learnings

This file is the harness's accumulated memory. It is the counterpart to the
SQLite telemetry database: telemetry records *what happened* (which agent ran,
when, and with what result), while this file records *what we learned from it*.
Together they are how the harness improves itself over time.

## How agents use this file

- **On start / when an issue comes up.** Every agent (Planner, Dev, QE, Ops)
  reads this file before it begins, and consults it again whenever it hits a
  problem — a failing test, an ambiguous spec, a broken command, a flaky
  environment. If a relevant lesson is recorded here, apply it instead of
  rediscovering the fix.
- **At the end of each harness run.** The workflow appends any new lessons from
  the run to the log below — what went wrong, the root cause, and the fix or
  guardrail that resolved it. Prefer durable, reusable lessons over one-off
  notes.

## Format

Each entry should be dated and attributed to the stage that learned it:

```
### YYYY-MM-DD — <stage> — <short title>
- **Problem:** what went wrong.
- **Root cause:** why it happened.
- **Fix / guardrail:** what to do next time (and where it was encoded — prompt,
  spec template, command, etc.).
```

## Lessons learned

### 2026-06-08 — Ops — No git repo / no remote in workspace
- **Problem:** Ops could not create a branch, commit, or open a PR because the workspace is not a git repository and has no GitHub remote configured. `git init` was also denied by the sandbox.
- **Root cause:** The harness root was not initialized as a git repo before the run; the operator did not pre-create a repo or remote for the project folder.
- **Fix / guardrail:** Before invoking the harness, the operator should `git init` the workspace (or project subfolder) and add a GitHub remote (`gh repo create ... --source=. --remote=origin`). Ops should detect missing repo/remote up front, surface a clear message, and skip PR creation rather than fail mid-stage.

### 2026-06-08 — QE — Verify server lifecycle cleanup
- **Problem:** Background `npm start` process needed explicit cleanup to avoid port 3000 leaking between runs.
- **Fix / guardrail:** Always `pkill -f "node src/server.js"` (or equivalent) after smoke-testing a server started in the background.

### 2026-06-08 — Ops — Subdirectory project paths in monorepo
- **Problem:** The Node project lives under `hello-world-api/`, not the repo root. Naively staging `src/app.js` would miss the actual modified file.
- **Root cause:** Spec paths in `specs/*.md` are relative to the project subfolder, but git operations run from the repo root.
- **Fix / guardrail:** Ops should run `git status` first to discover real paths and stage files by their repo-root path (e.g. `hello-world-api/src/app.js`). Do not assume spec-relative paths.

### 2026-06-08 — Ops — Remote is present when repo was pre-initialized
- **Problem:** Previous lesson warned about missing repo/remote; this run had both already configured.
- **Fix / guardrail:** Always probe `git remote -v` and `gh auth status` early; only surface the "missing repo" message when actually missing. Don't pre-emptively skip PR creation.

### 2026-06-08 — Ops — Detect partial prior implementation before declaring "already merged"
- **Problem:** A prior commit on master (`2c79e09 "Add GET /goodbye endpoint"`) suggested the spec was already implemented, but `git status` revealed uncommitted modifications to `app.js` plus an untracked test file — the prior commit was incomplete.
- **Root cause:** Commit subject lines can match a spec while the working tree still holds additional, unmerged work (especially newly-added test files).
- **Fix / guardrail:** Always inspect `git status` (working tree + untracked) in addition to `git log` before concluding a spec is already merged. Only skip branch/commit/PR when the tree is clean AND the diff vs. spec is empty.

### 2026-09-06 — Ops — Telemetry MCP server unreachable for entire run
- **Problem:** `mcp__telemetry__recordTelemetry` was unreachable (connection closed / tool not present) for the entire Dev, QE, and Ops stages of this run, so no telemetry events could be recorded despite the mandate to log every action.
- **Root cause:** The telemetry MCP server was down or not connected for this session; the harness did not surface this until agents tried to call the tool.
- **Fix / guardrail:** Check telemetry server connectivity at harness start (e.g. a single lightweight test call). If it is down, agents should proceed without blocking on it — telemetry is an audit trail, not a task gate — but must clearly flag the outage in their report/summary so the gap is visible to the operator, as was done here.

### 2026-09-06 — Ops — `origin` remote may be read-only; fall back to a fork
- **Problem:** `git push -u origin <branch>` was rejected with `403 Permission ... denied`. `gh repo view --json viewerPermission` showed only `READ` access for the authenticated account on the configured `origin` remote, even though `gh auth status` showed a valid, logged-in token.
- **Root cause:** Being authenticated via `gh auth status` does not imply write/push access to a given repository; `origin` can point at an upstream the account can only read (e.g. a shared/template harness repo).
- **Fix / guardrail:** If push to `origin` is rejected with 403, check `gh repo view <owner>/<repo> --json viewerPermission` before giving up. If permission is read-only, run `gh repo fork <owner>/<repo>` (without `--remote`, to avoid mutating `origin`), add the fork as a separate remote (e.g. `fork`), push the feature branch there, and open the PR with `gh pr create --repo <upstream> --base master --head <you>:<branch>`. Also check for stale same-named branches left on the fork by earlier runs (`git fetch fork <branch>`) — rename the local branch (e.g. append a date suffix) rather than force-pushing over them, since force-push is prohibited.

