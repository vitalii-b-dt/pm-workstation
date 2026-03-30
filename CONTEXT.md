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

### Key technical facts

- **Fork repo**: `github.com/vitalii-b-dt/opencode`
- **Local clone**: `~/Projects/opencode-fork` (separate from `pm-workstation`)
- **PM workspace**: `~/Projects/pm-workspace` — where the agent's context lives (`memories/`, skills, `AGENTS.md`)
- **Build**: `bun run build` inside `packages/app` produces the SolidJS web UI; full binary built via `bun run build` at repo root
- **Dev**: Run `bun run dev` in `packages/app` to get hot-reload UI against a running OpenCode server
- **PM feature files** (keep changes here to minimize rebase conflicts):
  - `packages/app/src/pages/layout/sidebar-items.tsx` — add Memory Notes section to sidebar
  - `packages/app/src/pages/session/session-side-panel.tsx` — add Memory tab to side panel

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

### Spike (completed)
- [x] Health check / connection status indicator
- [x] Session list and session creation
- [x] Agent chat interface with streaming responses
- [x] Markdown editor for `memories/` files
- [x] Notes/file sidebar (list `memories/*.md`)
- [x] Persistent layout (sidebar + main area)

### v0.1 (next)
- [ ] **Session history** — load prior messages when opening an existing session
- [ ] **File preview canvas** — open any workspace file and view it rendered as markdown (no more VS Code for previewing agent output)
- [ ] **Reassess Memory button** — in the notes panel, triggers a canned agent prompt to review the session and suggest memory file updates
- [ ] **Cmd+S to save notes** — keyboard shortcut in addition to Save button

### Out of scope for v0.1
- Jira / Confluence / GitHub connectors (v0.2+)
- Agent-triggered automatic memory file writes (v0.2+)
- Roadmap or project board views
- User onboarding flow
- Auth / multi-user
- Packaging as a native .app (Tauri)
- Design polish / component library
- Tests

---

## Decisions Made

### Use Next.js App Router (not Pages Router)
React/Next.js is the builder's existing experience. App Router gives a clean server/client component split that matches the SDK's server-vs-browser constraints well.

### Editor: `@uiw/react-md-editor`
React-native, markdown-focused, has split view (edit + preview). No heavy dependencies. Alternative considered: Milkdown (more extensible but more complex for a spike).

### Start with localhost web app, not packaged Tauri app
Tauri requires Rust knowledge. A localhost web app validates the product concept without blocking on native packaging. Tauri wrapping comes after the concept is proven.

### PM workspace directory is `pm-workspace`, not `pm-workstation`
The agent's context (memories, skills, AGENTS.md) lives in the existing `pm-workspace` project. The `pm-workstation` directory is the source code of the UI application. The SDK `directory` parameter always points to `pm-workspace`.

---

## Open Questions (unresolved)

1. **`client.file.write()` exists?** — Confirmed: not present. `fs` module in API routes is the permanent approach.

2. **Localhost web app vs. packaged `.app`** — unknown whether target users will tolerate a browser-based tool or require a native app feel. Validate with the first external user.

3. **Name** — "PM Workstation" is a working title. A real name and GitHub repo slug TBD before any public sharing.

---

## Risks (from Pre-Mortem, 2026-03-25)

| Risk | Severity | Status |
|---|---|---|
| No forcing function — side project stalls | High | Mitigate: public GitHub + 2 hrs/week commitment |
| Onboarding too hard for later-adopter PMs | High | Launch blocker before external sharing |
| Editor isn't the differentiator without agent context | Medium | Wire agent context sidebar in v0.1, not v0.3 |
| SDK breaks without semver contract | Medium | Pin version; minimal integration surface |
| Value prop not crisp enough | Elephant | Write it before writing code |
| Solo builder — no external user catching blind spots | Elephant | Find one other AI-enabled PM from week 1 |
