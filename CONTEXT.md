# PM Workstation — Product Context

This document captures the full product vision, strategic decisions, competitive landscape, and architecture rationale for PM Workstation. Read this before making any product or architecture decisions.

---

## The Problem

Product Managers who use AI agent tools (OpenCode, Cursor, Claude Projects) build their own setups from scratch. These setups are:

- **Optimized for coding**, not PM work — memory structures, skills, and workflows are code-centric
- **Hand-crafted and inconsistent** — every PM who does this invents their own conventions
- **Lacking PM-native UX** — you work in a terminal or a code editor, not a purpose-built environment
- **Fragmented** — notes live in Notion, specs in Confluence, tasks in Jira, agent context in a terminal. No unified workspace.

The owner of this project runs exactly this kind of hand-crafted setup (`~/Projects/pm-workspace`) and wants to turn the best parts of it into a proper tool.

---

## The Vision

**PM Workstation** is a desktop application for Product Managers that provides a unified, agent-powered environment where the AI has full context over your work — notes, decisions, active projects, specs — and where PM-native workflows (writing, planning, triage) feel natural rather than cobbled together.

The agent does the heavy lifting. The UI makes it effortless to give the agent context and act on its outputs.

### What it is not

- Not another AI chat interface (there are hundreds)
- Not a Notion/Confluence replacement
- Not a Jira alternative
- Not a coding tool with a PM mode bolted on

---

## Target User

**Primary (v1):** AI-enabled PMs — product managers who already use OpenCode, Cursor, or similar AI agent tools as part of their workflow. They understand the value of filesystem-native context and agentic loops, but find the current tooling too code-centric and too manual to configure.

**Secondary (v2+):** Later-adopter PMs who want the benefits of an AI-powered PM workstation but can't or won't hand-craft a setup themselves. They need a polished install experience and opinionated defaults.

---

## Key Differentiator

No existing tool combines:
1. **Local filesystem context** — the agent reads your actual notes, decisions, and project state
2. **Cross-tool agentic orchestration** — Jira, Confluence, GitHub in a single agent loop with confirmation gates
3. **Structured PM workflows** — PRDs, user stories, RICE scoring as first-class interactions
4. **Desktop-native UX** — not a web app, not a terminal, not an IDE extension

The closest existing thing is a hand-crafted OpenCode workspace (like `pm-workspace`). PM Workstation is that, productized.

---

## Competitive Landscape

| Tool | What they have | The gap |
|---|---|---|
| Notion AI | Good writing AI, workspace memory | No filesystem, no Jira write, walled garden |
| Fibery AI | Automations, feedback triage | Not truly agentic, no MCP |
| Linear | Q&A over issues | Read-only, no doc generation |
| Confluence AI | Summarize/suggest | Reactive, no agent loop |
| AnythingLLM | OSS desktop, document memory | No PM workflows, no Jira write |
| Claude Projects | Agent loop, project memory | No desktop, no filesystem, no structured PM flows |

**Market window**: ~12–18 months before SaaS incumbents close the gap.

---

## Architecture

### Core Principle: Fork OpenCode, add PM features natively

**Decision made: 2026-03-30**

PM Workstation is a fork of `sst/opencode`. PM-specific features (memory editor, canvas file preview, reassess-memory button) are added directly to the SolidJS UI. The fork is rebased against upstream periodically using agent-assisted automation.

**Why fork (not sidecar):**
- The only way to inject UI into OpenCode is to fork — there is no client-side plugin API
- A sidecar app (separate browser tab) feels second-class and duplicates already-polished OpenCode UI
- Agent-driven rebasing makes the maintenance cost manageable (~30-60 min every 2 weeks)
- Forking gives 95% of OpenCode's UI for free: streaming, tool visualization, keyboard shortcuts, file tree, all polish
- Building an equivalent "own wrapper" would take 5-8 sessions vs. 2-3 sessions for the fork

**Rebase strategy:**
- Fork lives at `github.com/vitalii-b-dt/opencode` (forked from `sst/opencode`)
- PM-specific changes are confined to clearly marked files/sections to minimize merge conflicts
- Rebase against `sst/opencode main` every 2 weeks (or on-demand for critical upstream fixes)
- High-conflict files (historically): `packages/app/src/pages/layout/sidebar-items.tsx`, `packages/app/src/pages/layout.tsx`
- Agent handles the rebase; human reviews and runs the build

**OpenCode tech stack (for PM feature development):**
- UI framework: SolidJS (not React)
- Styling: Tailwind CSS v4
- Build: Vite
- Language: TypeScript

### v1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                PM Workstation (forked OpenCode)              │
│                                                              │
│  ┌──────────────────┐  ┌───────────────────────────────────┐│
│  │  OpenCode native │  │     PM additions (new)            ││
│  │  UI (SolidJS)    │  │                                   ││
│  │                  │  │  - Memory Editor panel            ││
│  │  - Chat / stream │  │    (sidebar tab → edit *.md)      ││
│  │  - File tree     │  │  - Canvas file preview            ││
│  │  - Tool vis.     │  │    (rendered markdown)            ││
│  │  - Keyboard nav  │  │  - Reassess Memory button         ││
│  └──────────────────┘  └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                    │ REST + SSE (internal)
                    │
┌───────────────────▼─────────────────────────┐
│         OpenCode Server (same binary)        │
│                                              │
│  REST API + SSE event stream                 │
│  Working directory: ~/Projects/pm-workspace  │
└──────────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
┌───────▼──────┐      ┌─────────▼────────┐
│  memories/   │      │  MCP Servers     │
│  *.md files  │      │  (Jira, GitHub,  │
│  (filesystem)│      │   Confluence)    │
└──────────────┘      └──────────────────┘
```

### Repo structure — what is relevant

The fork has 19 packages. Most are irrelevant to PM Workstation:

| Package | Relevant? | Why |
|---|---|---|
| `packages/app/` | **Yes — work here** | SolidJS web UI; all PM features go here |
| `packages/ui/` | **Yes, read-only** | Shared SolidJS component library; use but don't modify |
| `packages/opencode/` | **No** | CLI/server engine; we are not changing agent logic |
| `packages/desktop/` | **Later** | Tauri wrapper — needed for v1 distribution packaging |
| `packages/desktop-electron/` | **Later** | Electron alternative — simpler than Tauri (no Rust) |
| `packages/sdk/` | **No** | Auto-generated API client; don't touch |
| Everything else | **No** | Cloud infra, marketing site, Slack, enterprise, extensions |

### The fork does NOT use your globally installed OpenCode binary

The fork is a self-contained copy of the full OpenCode source. In dev mode, `bun run dev` runs the TypeScript server directly — your global `opencode` CLI is not involved and not replaced. Only when you compile a release binary does it produce a new CLI.

### Dev workflow (two terminals)

```bash
# Terminal 1 — server from source, pointed at your PM workspace
cd ~/Projects/pm-workspace
~/.bun/bin/bun run --cwd ~/Projects/opencode-fork/packages/opencode \
  --conditions=browser src/index.ts serve --port 4096

# Terminal 2 — SolidJS UI with hot reload
cd ~/Projects/opencode-fork/packages/app
~/.bun/bin/bun run dev
# → http://localhost:3000, hot reload on every .tsx save
```

### Key technical facts

- **Fork repo**: `github.com/vitalii-b-dt/opencode`
- **Local clone**: `~/Projects/opencode-fork` (separate from `pm-workstation`)
- **PM workspace**: `~/Projects/pm-workspace` — where the agent's context lives (`memories/`, skills, `AGENTS.md`)
- **Bun location**: `~/.bun/bin/bun` (installed 2026-03-30; add to PATH via `~/.zshrc`)
- **Server**: Pure TypeScript/Bun — no Go, no Rust, no compilation step for dev
- **PM feature files** (keep changes confined here to minimize rebase conflicts):
  - `packages/app/src/pages/layout/sidebar-items.tsx` — sidebar nav items
  - `packages/app/src/pages/session/session-side-panel.tsx` — side panel tabs

---

## Value Proposition

> PM Workstation is a purpose-built writing and planning environment for AI-enabled PMs so that writing a PRD, spec, or brief goes from a multi-tool scramble to a single focused session with an agent that already knows your context.

Locked: 2026-03-27.

---

## Spike (Done — 2026-03-27)

All four spike sessions completed successfully. Key deviations from RESEARCH.md discovered:
- API paths have no `/v1/` prefix: `/global/health`, `/session`, `/session/{id}/prompt_async`
- SSE event types differ: streaming uses `message.part.delta` (not `message.part.created`), done signal is `session.idle` (not `session.updated`)
- `prompt_async` in the SDK is camelCase `promptAsync`

---

## V1 Scope

### Done (Phase 0 — Next.js spike, retired)
- [x] Proven: OpenCode REST + SSE connection works from a browser client
- [x] Proven: streaming agent responses work via `EventSource`
- [x] Proven: `memories/*.md` files can be read and written from a web app
- [x] Retired the Next.js sidecar approach — too much duplication of OpenCode's existing UI

### Done (Phase 1 setup — fork scaffolding)
- [x] Fork created at `github.com/vitalii-b-dt/opencode` (v1.3.7)
- [x] Local clone at `~/Projects/opencode-fork`, upstream remote added
- [x] `bun install --ignore-scripts && bun run build` passes in `packages/app`

### Next: PM features to add to the fork (in order)

1. **Memory Editor panel** — highest priority; the core PM workflow
   - File: `packages/app/src/pages/session/session-side-panel.tsx`
   - New "Memory" tab in the side panel; lists `memories/*.md`, click to edit inline
   - Save on Cmd+S

2. **Reassess Memory button**
   - File: `packages/app/src/pages/layout/sidebar-items.tsx`
   - Button that fires a canned prompt to the active session

3. **Canvas file preview** (rendered markdown, not raw diff)
   - File: `packages/app/src/pages/session/session-side-panel.tsx`
   - When a workspace `.md` file is open in the side panel, offer a rendered preview mode

### Out of scope for v1
- Jira / Confluence / GitHub connectors (v2+, MCP-side — no UI changes needed)
- Agent-triggered automatic memory file writes
- Roadmap or project board views
- User onboarding flow
- Auth / multi-user
- Tests

---

## Decisions Made

### Fork OpenCode, not a sidecar app (2026-03-30)
See Architecture section above. The sidecar Next.js approach was retired after the spike proved it duplicates what OpenCode already does better.

### No new npm dependencies in the fork
The fork already has a markdown renderer in `packages/ui/`. Use it. Adding dependencies increases rebase conflict surface and binary size.

### Mark all PM additions with `// PM WORKSTATION:` comments
Makes rebasing easier — easy to grep for every PM-specific line when resolving conflicts.

### PM workspace directory is `pm-workspace`, not `pm-workstation`
The agent's context (memories, skills, AGENTS.md) lives in `~/Projects/pm-workspace`. The fork source lives in `~/Projects/opencode-fork`. The `pm-workstation` repo is documentation only.

### Packaging: Electron over Tauri for v1 distribution
When packaging for other machines, prefer `packages/desktop-electron/` over `packages/desktop/` (Tauri). Electron requires no Rust toolchain, making agent-assisted builds practical. Tauri is an option if a smaller binary size becomes important later.

### Start with dev mode, not packaged binary
For the current phase (personal use + one external tester), running from source via `bun run dev` is sufficient. Package only when preparing to share more broadly.

---

## Open Questions (unresolved)

1. **Markdown editor component in the fork** — OpenCode's side panel renders diffs and raw file content. It is not yet confirmed whether there is an existing editable markdown component in `packages/ui/` to reuse, or whether we need to wire in a minimal editor. Confirm before implementing the Memory Editor panel.

2. **How to write files from the SolidJS UI** — the fork's UI communicates with the OpenCode server via REST. Whether the server exposes a file-write endpoint for arbitrary workspace files (not just session outputs) needs to be verified. Fallback: add a thin API endpoint in `packages/opencode/src/server/`.

3. **Localhost web app vs. packaged `.app`** — unknown whether target users will tolerate opening a browser tab or require a native app feel. Validate with the first external user before investing in Electron packaging.

4. **Name** — "PM Workstation" is a working title. A real name and public-facing identity TBD before broader sharing.

5. **Dev server confirmed working?** — `bun run build` in `packages/app` passes. `bun run dev` (Vite hot-reload) has not been tested end-to-end against the server yet. Do this at the start of the next implementation session.

---

## Risks

| Risk | Severity | Status |
|---|---|---|
| No forcing function — side project stalls | High | Mitigate: public GitHub + 2 hrs/week commitment |
| Onboarding too hard for later-adopter PMs | High | Launch blocker before external sharing |
| Rebase conflicts become expensive | Medium | Mitigate: changes confined to 2 files; agent handles rebase; ~30-60 min per 2-week window |
| Upstream restructures the insertion point files | Medium | Happened once in 90 days (sidebar-items.tsx, +129/-113). Manageable but must be watched. |
| No external user catching blind spots | High | Find one other AI-enabled PM before v1 is "done" |
| Electron packaging complexity | Low | Not needed until distribution; Electron path is well-documented in the fork |
