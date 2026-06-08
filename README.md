# agent-harness-with-claude-code

A gated **Dev → QE → Ops** workflow harness built on Claude Code subagents. You hand it a spec; it implements, verifies, and ships a pull request — recording every step to a local SQLite telemetry DB and accumulating lessons in `LEARNING.md`.

## How it works

The `/harness` slash command runs in the main thread as an **orchestrator**. It does not edit code itself. Instead, it delegates each stage to a dedicated subagent with a self-contained prompt, then enforces a gate before advancing.

Stages:

1. **Dev** (`.claude/agents/dev.md`) — implements the spec, writes/runs unit tests. Gate: all unit tests pass.
2. **QE** (`.claude/agents/qe.md`) — verifies every acceptance criterion against a running build (live `curl`, regression checks, server lifecycle cleanup). Gate: every criterion green.
3. **Ops** (`.claude/agents/ops.md`) — branches, commits, opens a PR via `gh`, and appends lessons learned to `LEARNING.md`.

If QE fails, the orchestrator loops back to Dev with the failure context. Maximum **2** Dev → QE cycles before the run aborts as `harness_failed`. Ops never runs on a failed gate.

Persistence:
- **Telemetry** — `tools/telemetry-mcp` is a local MCP server that appends events (`harness_started`, `delegation_start/end`, `gate_decision`, `loopback`, `harness_completed`, …) to a SQLite DB. Records *what happened*.
- **LEARNING.md** — durable, human-readable lessons appended at the end of each run (or when something noteworthy occurs). Records *what was learned*.

### ASCII flow

```
                 ┌────────────────────────────────────────────────┐
                 │  /harness <spec.md>                            │
                 │  (orchestrator — main thread)                  │
                 └────────────────────────────────────────────────┘
                                       │
                                       │ reads LEARNING.md + spec
                                       ▼
              ┌────────────────────────────────────────────────────┐
              │                                                    │
              ▼                                                    │  loopback
        ┌─────────┐   pass    ┌─────────┐   pass    ┌─────────┐    │  (max 2 cycles)
        │   Dev   │──────────▶│   QE    │──────────▶│   Ops   │    │
        │ subagent│           │ subagent│           │ subagent│    │
        └─────────┘           └─────────┘           └─────────┘    │
             │                     │                     │         │
             │ fail                │ fail                │         │
             └──────────┐          └──────────┐          ▼         │
                        │                     │   ┌────────────┐   │
                        │                     │   │  gh PR url │   │
                        ▼                     ▼   └────────────┘   │
                  ┌───────────────────────────────┐                │
                  │  re-spawn Dev w/ failure ctx  │────────────────┘
                  └───────────────────────────────┘

   every transition ──▶  mcp__telemetry__recordTelemetry  ──▶  telemetry.db
   end of run        ──▶  append lessons                  ──▶  LEARNING.md
```

## Repository layout

```
.claude/
  agents/        dev.md  qe.md  ops.md  planner.md   (subagent definitions)
  commands/      harness.md                          (the /harness slash command)
specs/           goodbye-endpoint.md  hello-world-api.md
tools/
  telemetry-mcp/                                     (local MCP server, SQLite events)
  agent-memory/
hello-world-api/                                     (sample target project)
LEARNING.md                                          (accumulated lessons)
```

## Quickstart

Run the bundled `goodbye-endpoint` spec end-to-end.

### Prereqs

- Node.js ≥ 18, `npm`
- [Claude Code](https://docs.claude.com/claude-code) CLI
- `gh` CLI authenticated (`gh auth status`) — needed for Ops to open a PR
- Git repo with a remote (`git remote -v`)

### Steps

1. Clone and enter the repo:
   ```bash
   git clone <this-repo-url>
   cd agent-harness-with-claude-code
   ```

2. Install the sample project's deps (so Dev/QE can run tests):
   ```bash
   cd hello-world-api && npm install && cd ..
   ```

3. Launch Claude Code from the repo root:
   ```bash
   claude
   ```

4. Run the harness against the goodbye-endpoint spec:
   ```
   /harness specs/goodbye-endpoint.md
   ```

5. Watch the operator status lines. Expected sequence:
   ```
   ▶ [1/3] Dev — delegating to dev agent ...
   ✓ Dev passed
   ▶ [2/3] QE — delegating to qe agent ...
   ✓ QE passed
   ▶ [3/3] Ops — delegating to ops agent ...
   ✓ Ops — PR: https://github.com/<you>/.../pull/<n>
   ✓ harness_completed — PR <url>
   ```

### What the goodbye-endpoint spec does

Adds `GET /goodbye` to `hello-world-api` mirroring `GET /hello`:
- `GET /goodbye` → `{"message":"Goodbye, World!"}`
- `GET /goodbye?name=Foo` → `{"message":"Goodbye, Foo!"}`
- New `tests/goodbye.test.js` with two supertest cases
- All existing tests still pass; unknown routes still return 404

After the run you'll see a new PR on GitHub, a new commit on a `feature/goodbye-endpoint*` branch, and any noteworthy observations appended to `LEARNING.md`.

## Writing your own spec

Drop a markdown file into `specs/` with these sections (see `specs/goodbye-endpoint.md` as a template):

- **Objective** — one paragraph
- **Module Contracts** — files to add/modify
- **Endpoint / Behavior Specification** — exact inputs and outputs
- **Test Specification** — concrete test cases
- **Acceptance Criteria** — checkboxes QE will verify one by one
- **File List** — paths touched
- **Out of Scope** — explicit non-goals

Then: `/harness specs/<your-spec>.md`.

## Telemetry

Events stream to a SQLite DB via the `mcp__telemetry__recordTelemetry` tool exposed by `tools/telemetry-mcp`. Inspect runs with `sqlite3` against the DB the MCP server writes to.

## Notes

- Ops will detect missing git repo / remote and surface a clear message rather than fail mid-stage.
- The harness runs autonomously between gates — no per-stage prompts. Only blockers and terminal states are surfaced.
- LEARNING.md is read at the start of every run and re-consulted on stage failure; lessons feed forward into subsequent runs.
