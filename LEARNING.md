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

### 2026-06-08 — Ops — End-to-end PR flow succeeded with pre-configured repo
- **Problem:** None — confirming the happy path.
- **Root cause:** N/A.
- **Fix / guardrail:** When `git remote -v` shows `origin` and `gh auth status` is healthy, proceed directly with `git checkout -b`, stage by repo-root paths, commit, `git push -u origin <branch>`, then `gh pr create --base master --head <branch>`. Use HEREDOC for both commit and PR body to preserve formatting. No force/amend needed.

### 2026-06-08 — Ops — Telemetry MCP tool may be absent
- **Problem:** `mcp__telemetry__recordTelemetry` was not registered in this run; all telemetry calls errored.
- **Root cause:** MCP server not loaded in the agent's tool registry despite prompt requirements.
- **Fix / guardrail:** If the telemetry tool is missing, do not abort — continue the workflow, note the absence in the final report, and rely on git/gh outputs as the audit trail.

### 2026-06-08 — Ops — Detect partial prior implementation before declaring "already merged"
- **Problem:** A prior commit on master (`2c79e09 "Add GET /goodbye endpoint"`) suggested the spec was already implemented, but `git status` revealed uncommitted modifications to `app.js` plus an untracked test file — the prior commit was incomplete.
- **Root cause:** Commit subject lines can match a spec while the working tree still holds additional, unmerged work (especially newly-added test files).
- **Fix / guardrail:** Always inspect `git status` (working tree + untracked) in addition to `git log` before concluding a spec is already merged. Only skip branch/commit/PR when the tree is clean AND the diff vs. spec is empty.

