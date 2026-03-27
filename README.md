# PM Workstation

A purpose-built writing and planning environment for AI-enabled PMs so that writing a PRD, spec, or brief goes from a multi-tool scramble to a single focused session with an agent that already knows your context.

---

## What it is

PM Workstation is a localhost web app that wraps [OpenCode](https://opencode.ai) with a PM-native UI. Instead of working in a terminal, you get:

- **Chat** — send prompts to an OpenCode agent and see responses streamed in readable markdown
- **Session history** — reopen any past session and pick up where you left off
- **Canvas** — browse and preview any markdown file in your workspace
- **Memory editor** — read and edit your `memories/` context files (active projects, decisions, concepts) with Cmd+S to save
- **Reassess Memory** — one-click prompt that asks the agent to review your session and suggest memory file updates

The agent already knows your context because it reads your workspace files directly. You just write.

---

## Prerequisites

1. **OpenCode CLI** — install from [opencode.ai](https://opencode.ai)
2. **A PM workspace** — a directory with `memories/*.md` files the agent uses as context
3. **Node.js 18+**

---

## Setup

### 1. Start the OpenCode server

Run this from your PM workspace directory (the one with your `memories/` files):

```bash
opencode serve --port 4096
```

The server must be running before you start the Next.js app. Keep it running in the background.

### 2. Configure constants

Edit `src/lib/constants.ts` to point to your workspace:

```typescript
export const SERVER_URL = "http://127.0.0.1:4096"
export const WORKSPACE_DIR = "/path/to/your/pm-workspace"
export const MEMORIES_DIR = `${WORKSPACE_DIR}/memories`
```

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home / health check
│   ├── sessions/[sessionId]/   # Chat view with streaming + history
│   ├── notes/[filename]/       # Markdown editor for memory files
│   ├── canvas/                 # File tree + markdown preview
│   └── api/                    # Next.js API routes (sessions, notes, workspace)
├── components/
│   └── Sidebar.tsx             # Navigation + SSE connection status
└── lib/
    ├── constants.ts            # SERVER_URL, WORKSPACE_DIR, MEMORIES_DIR
    └── opencode.ts             # SDK client singleton
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router, TypeScript, Tailwind CSS |
| Agent SDK | `@opencode-ai/sdk` |
| Streaming | Native browser `EventSource` |
| Editor | `@uiw/react-md-editor` |
| File writes | Node.js `fs` in API routes |

---

## Architecture

PM Workstation is a **sidecar client**, not a fork. OpenCode handles all agent orchestration. The Next.js app connects to it via the official SDK and SSE event stream.

```
PM Workstation (Next.js :3000)
        │
        │  @opencode-ai/sdk + EventSource
        │
OpenCode Server (:4096)
        │
   pm-workspace/
   ├── memories/      ← agent context files
   └── AGENTS.md      ← agent instructions
```

No forking OpenCode means upgrades are a single `npm update`.

---

## Status

- v0.1 complete — chat, history, canvas, memory editor, Reassess Memory, Cmd+S
- v0.2 planned — Jira / Confluence / GitHub connectors

---

## Important: no server password

Do not set `OPENCODE_SERVER_PASSWORD`. Browser `EventSource` cannot send auth headers, which breaks SSE streaming.
