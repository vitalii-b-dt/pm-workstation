# PM Workstation — Agent Instructions

You are a coding agent working on **PM Workstation**: a purpose-built desktop application for Product Managers that wraps the OpenCode agent via its SDK, providing a PM-native UI instead of a raw terminal interface.

Read `CONTEXT.md` and `RESEARCH.md` before starting any coding task. Read `SPIKE.md` to understand the current build plan and which session you are in.

---

## What This Project Is

A **Next.js web client** (React, App Router, TypeScript, Tailwind CSS) that:

1. Connects to a locally running **OpenCode server** (`opencode serve --port 4096`) via `@opencode-ai/sdk`
2. Provides a **PM-native UI** — not a generic AI chat, not a code editor
3. Reads and writes **local markdown files** (`memories/*.md`) as the persistent PM context layer
4. Renders agent responses with PM-appropriate structure (not raw terminal output)

This is a **localhost web app** for personal use in v1. No auth, no cloud, no deployment target beyond the local machine.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ App Router | TypeScript, `src/` directory |
| Styling | Tailwind CSS | Utility-first, no component library in v1 |
| Agent SDK | `@opencode-ai/sdk` v2 | `createOpencodeClient` from `@opencode-ai/sdk/v2/client` |
| Streaming | Native `EventSource` | Browser API, no wrapper needed |
| Editor | `@uiw/react-md-editor` | Markdown editor with preview, React-native |
| File I/O | SDK `client.file.read/list` + `fs` in API routes | SDK for reads, `fs` module for writes in API routes |

---

## Project Structure (target)

```
pm-workstation/
├── AGENTS.md              ← this file
├── CONTEXT.md             ← product vision, decisions, architecture
├── SPIKE.md               ← session-by-session build plan
├── RESEARCH.md            ← OpenCode SDK API reference and findings
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← root layout with sidebar
│   │   ├── page.tsx           ← home / health check
│   │   ├── sessions/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx   ← chat view for a session
│   │   └── notes/
│   │       ├── page.tsx       ← list of memory files
│   │       └── [filename]/
│   │           └── page.tsx   ← markdown editor for a file
│   ├── api/
│   │   ├── sessions/
│   │   │   ├── route.ts       ← GET (list) + POST (create)
│   │   │   └── [id]/
│   │   │       └── prompt/
│   │   │           └── route.ts ← POST (send message async)
│   │   └── notes/
│   │       └── [filename]/
│   │           └── route.ts   ← GET (read) + POST (write)
│   ├── lib/
│   │   ├── opencode.ts        ← SDK client singleton
│   │   └── constants.ts       ← WORKSPACE_DIR, SERVER_URL
│   └── components/
│       ├── Sidebar.tsx
│       ├── ChatView.tsx
│       ├── MessageStream.tsx
│       └── NoteEditor.tsx
```

---

## Critical Constants

```typescript
// src/lib/constants.ts
export const SERVER_URL = "http://127.0.0.1:4096"
export const WORKSPACE_DIR = "/Users/vitalii.batyr/Projects/pm-workspace"
export const MEMORIES_DIR = `${WORKSPACE_DIR}/memories`
```

`WORKSPACE_DIR` is the **pm-workspace** directory (the existing PM workspace with `memories/` files), not this project's own directory. The OpenCode agent uses that workspace as its working context.

---

## SDK Client Singleton

```typescript
// src/lib/opencode.ts
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { SERVER_URL, WORKSPACE_DIR } from "./constants"

export const client = createOpencodeClient({
  baseUrl: SERVER_URL,
  directory: WORKSPACE_DIR,
})
```

Use this singleton everywhere. Do not instantiate multiple clients.

---

## SSE Pattern (streaming agent responses)

The SDK does not wrap SSE — use native `EventSource` directly in client components:

```typescript
useEffect(() => {
  const es = new EventSource(
    `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
  )
  es.onmessage = (e) => {
    const event = JSON.parse(e.data)
    if (event.type === "message.part.created") {
      // append event.properties to message state
    }
  }
  return () => es.close()
}, [])
```

Key event types to handle:
- `server.connected` — SSE connection established
- `server.heartbeat` — keep-alive, ignore
- `message.part.created` — new text chunk from agent, append to UI
- `session.updated` — session metadata changed

---

## File Write Pattern

`client.file` may be read-only. For writing, use the `fs` module inside Next.js API routes (they run in Node.js):

```typescript
// src/app/api/notes/[filename]/route.ts
import { writeFileSync } from "fs"
import { join } from "path"
import { MEMORIES_DIR } from "@/lib/constants"

export async function POST(req: Request, { params }: { params: { filename: string } }) {
  const { content } = await req.json()
  const filePath = join(MEMORIES_DIR, params.filename)
  writeFileSync(filePath, content, "utf-8")
  return Response.json({ ok: true })
}
```

---

## What to Build First

Follow `SPIKE.md` exactly. The spike has 4 sessions in strict order:

1. **Session 1** — Scaffold, SDK connection, health check, session list
2. **Session 2** — Send prompt + stream response via SSE
3. **Session 3** — Markdown editor wired to `memories/` files
4. **Session 4** — Assemble PM layout (sidebar + chat + editor)

Do not skip ahead. Each session validates a critical assumption before the next one builds on it.

---

## Prerequisites Before Running

The OpenCode server must be running before the Next.js app starts:

```bash
opencode serve --port 4096
```

This must be run in the `pm-workspace` directory (or with `--cwd /Users/vitalii.batyr/Projects/pm-workspace`).

The Next.js app connects to `http://127.0.0.1:4096`. If the server is not running, all SDK calls will fail with connection errors.

---

## Conventions

- **No auth** in v1 — localhost trust, no `OPENCODE_SERVER_PASSWORD`
- **No error handling polish** — `console.error` is fine for the spike; proper error UI comes in v0.1
- **No design system** — Tailwind utility classes only, no shadcn/ui or similar in the spike
- **Server components by default** — only add `"use client"` where SSE subscriptions or user interaction requires it
- **No tests** in the spike — validate by running, not by test suite
- All file paths are **absolute** — never relative paths when calling SDK or `fs`

---

## Key References

- Full SDK API surface → `RESEARCH.md`
- Architecture decisions and rationale → `CONTEXT.md`
- Session-by-session build plan → `SPIKE.md`
- OpenCode SDK source: `https://github.com/sst/opencode` (packages/sdk)
