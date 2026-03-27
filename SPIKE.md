# PM Workstation — Technical Spike Plan

## Goal

Validate three things in the shortest possible time, in strict order:

1. A Next.js app can connect to the OpenCode server and render session data
2. Streaming agent responses work in a PM-styled chat UI
3. Memory markdown files can be read and written from within the app

If all three are green: proceed to v0.1 planning.
If any is red: you know before investing weeks.

**Estimated time:** ~8 hours across 4 sessions (~2 hrs each).

---

## Prerequisites

Before writing any code, confirm:

```bash
# OpenCode must be installed
opencode --version

# Node.js must be installed
node --version   # 18+ required for Next.js 14

# Start the OpenCode server (run this in a separate terminal, keep it running)
opencode serve --port 4096
# Expected output: opencode server listening on http://127.0.0.1:4096
```

The Next.js app connects to `http://127.0.0.1:4096`. If the server isn't running, everything fails.

---

## Session 1 — Scaffold + Connect (~2 hrs)

**Goal:** Next.js app running, health check passing, session list rendering.

### Steps

**1. Create the project**
```bash
cd ~/Projects/pm-workstation
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```
Accept all defaults. Do not initialize git yet (directory already has context files).

**2. Install the SDK**
```bash
npm install @opencode-ai/sdk
```

**3. Create constants**

`src/lib/constants.ts`:
```typescript
export const SERVER_URL = "http://127.0.0.1:4096"
export const WORKSPACE_DIR = "/Users/vitalii.batyr/Projects/pm-workspace"
export const MEMORIES_DIR = `${WORKSPACE_DIR}/memories`
```

**4. Create SDK client singleton**

`src/lib/opencode.ts`:
```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { SERVER_URL, WORKSPACE_DIR } from "./constants"

export const client = createOpencodeClient({
  baseUrl: SERVER_URL,
  directory: WORKSPACE_DIR,
})
```

**5. Health check on home page**

`src/app/page.tsx` — server component:
```typescript
import { client } from "@/lib/opencode"

export default async function HomePage() {
  const health = await client.global.health()
  return (
    <main>
      <h1>PM Workstation</h1>
      <p>OpenCode: {health.healthy ? "connected" : "disconnected"} · v{health.version}</p>
    </main>
  )
}
```

**6. Session list page**

`src/app/sessions/page.tsx` — server component:
```typescript
import { client } from "@/lib/opencode"

export default async function SessionsPage() {
  const sessions = await client.session.list({})
  return (
    <ul>
      {sessions.map((s) => (
        <li key={s.id}>{s.title ?? s.id}</li>
      ))}
    </ul>
  )
}
```

**7. Session create API route**

`src/app/api/sessions/route.ts`:
```typescript
import { client } from "@/lib/opencode"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await client.session.create()
  return NextResponse.json(session)
}

export async function GET() {
  const sessions = await client.session.list({})
  return NextResponse.json(sessions)
}
```

### Done when
- `http://localhost:3000` shows OpenCode version and "connected"
- `http://localhost:3000/sessions` renders a list of session IDs/titles

### Key risk probe
Does `client.session.list()` work from a Next.js server component? (It should — server components call localhost:4096 directly, no CORS constraint.)

---

## Session 2 — Send Prompt + Stream Response (~2 hrs)

**Goal:** Type a PM prompt, see the agent response stream in real time.

### Steps

**1. Prompt API route (async)**

`src/app/api/sessions/[id]/prompt/route.ts`:
```typescript
import { client } from "@/lib/opencode"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { text } = await req.json()
  await client.session.prompt_async({
    path: { sessionID: params.id },
    body: { parts: [{ type: "text", text }] },
  })
  return NextResponse.json({ ok: true })
}
```

Note: `prompt_async` fires and returns 204 immediately. The response streams via SSE.

**2. Chat page — client component**

`src/app/sessions/[sessionId]/page.tsx`:
```typescript
"use client"
import { useState, useEffect, useRef } from "react"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

type Part = { type: string; text?: string }

export default function ChatPage({ params }: { params: { sessionId: string } }) {
  const [input, setInput] = useState("")
  const [parts, setParts] = useState<Part[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  // SSE subscription
  useEffect(() => {
    const url = `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === "message.part.created") {
        setParts((prev) => [...prev, event.properties])
      }
      if (event.type === "session.updated") {
        setIsStreaming(false)
      }
    }

    return () => es.close()
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    setIsStreaming(true)
    await fetch(`/api/sessions/${params.sessionId}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    })
    setInput("")
  }

  return (
    <div>
      <div>
        {parts.filter(p => p.type === "text").map((p, i) => (
          <p key={i}>{p.text}</p>
        ))}
        {isStreaming && <p>thinking...</p>}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
```

### Done when
- Navigate to `/sessions/[id]`, type "summarize my active projects", press Send
- Agent response streams into the UI within 2 seconds

### Key risk probe
Is `message.part.created` the correct event type? If nothing streams, console.log all SSE events to find the correct type name. Also check whether `prompt_async` exists in the installed SDK version — if not, fall back to `prompt` (blocking).

### Fallback if prompt_async doesn't exist
```typescript
// Use blocking prompt instead
const result = await client.session.prompt({
  path: { sessionID: params.id },
  body: { parts: [{ type: "text", text }] },
})
// Render result.parts directly — no SSE needed
```

---

## Session 3 — Markdown Editor wired to memories/ (~2 hrs)

**Goal:** Open, edit, and save a memory file from within the app.

### Steps

**1. Install editor**
```bash
npm install @uiw/react-md-editor
```

**2. Notes list API route**

`src/app/api/notes/route.ts`:
```typescript
import { readdirSync } from "fs"
import { MEMORIES_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET() {
  const files = readdirSync(MEMORIES_DIR).filter((f) => f.endsWith(".md"))
  return NextResponse.json(files)
}
```

**3. Note read/write API route**

`src/app/api/notes/[filename]/route.ts`:
```typescript
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { MEMORIES_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: { filename: string } }
) {
  const content = readFileSync(join(MEMORIES_DIR, params.filename), "utf-8")
  return NextResponse.json({ content })
}

export async function POST(
  req: Request,
  { params }: { params: { filename: string } }
) {
  const { content } = await req.json()
  writeFileSync(join(MEMORIES_DIR, params.filename), content, "utf-8")
  return NextResponse.json({ ok: true })
}
```

**4. Notes list page**

`src/app/notes/page.tsx` — server component:
```typescript
export default async function NotesPage() {
  const res = await fetch("http://localhost:3000/api/notes")
  const files: string[] = await res.json()
  return (
    <ul>
      {files.map((f) => (
        <li key={f}>
          <a href={`/notes/${f}`}>{f}</a>
        </li>
      ))}
    </ul>
  )
}
```

**5. Note editor page — client component**

`src/app/notes/[filename]/page.tsx`:
```typescript
"use client"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

export default function NotePage({ params }: { params: { filename: string } }) {
  const [content, setContent] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/notes/${params.filename}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content))
  }, [params.filename])

  const save = async () => {
    await fetch(`/api/notes/${params.filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2>{params.filename}</h2>
      <button onClick={save}>{saved ? "Saved!" : "Save"}</button>
      <MDEditor value={content} onChange={(v) => setContent(v ?? "")} />
    </div>
  )
}
```

### Done when
- Navigate to `/notes`, see list of `memories/*.md` files
- Click a file, see its content in the editor
- Edit and save — change persists on disk after browser refresh

### Key risk probe
Does `@uiw/react-md-editor` render correctly with Next.js App Router? The `dynamic` import with `{ ssr: false }` is required — it uses browser APIs. If it still fails, try wrapping in a `Suspense` boundary.

---

## Session 4 — PM Layout Assembly (~2 hrs)

**Goal:** Combine the three pieces into a navigable, minimal PM workstation layout.

### Steps

**1. Root layout with sidebar**

`src/app/layout.tsx`:
```typescript
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = { title: "PM Workstation" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-950 text-gray-100">
        <aside className="w-64 flex-shrink-0 border-r border-gray-800 p-4 flex flex-col gap-6">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </body>
    </html>
  )
}
```

**2. Sidebar component**

`src/components/Sidebar.tsx` — client component (needs fetch for dynamic session list):
```typescript
"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

export default function Sidebar() {
  const [sessions, setSessions] = useState<{ id: string; title?: string }[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(setSessions)
    fetch("/api/notes").then(r => r.json()).then(setNotes)

    // Health check
    fetch(`${SERVER_URL}/v1/global/health`)
      .then(r => r.json())
      .then(d => setConnected(d.healthy))
      .catch(() => setConnected(false))
  }, [])

  const newSession = async () => {
    const res = await fetch("/api/sessions", { method: "POST" })
    const s = await res.json()
    window.location.href = `/sessions/${s.id}`
  }

  return (
    <>
      <div className="text-xs text-gray-500">
        OpenCode {connected ? "● connected" : "○ disconnected"}
      </div>

      <section>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Sessions</span>
          <button onClick={newSession} className="text-xs text-blue-400">+ New</button>
        </div>
        <ul className="space-y-1">
          {sessions.map(s => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="text-sm truncate block hover:text-white">
                {s.title ?? s.id.slice(0, 12)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">Notes</span>
        </div>
        <ul className="space-y-1">
          {notes.map(f => (
            <li key={f}>
              <Link href={`/notes/${f}`} className="text-sm truncate block hover:text-white">
                {f.replace(".md", "")}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
```

**3. Wire SSE status into sidebar**

Add a second `useEffect` to `Sidebar.tsx` that opens an `EventSource` and updates `connected` state live:
```typescript
useEffect(() => {
  const es = new EventSource(
    `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
  )
  es.onmessage = (e) => {
    const event = JSON.parse(e.data)
    if (event.type === "server.connected") setConnected(true)
  }
  es.onerror = () => setConnected(false)
  return () => es.close()
}, [])
```

### Done when
- One browser tab with sidebar showing sessions list, notes list, and connection status
- Click a session → chat view loads in main area
- Click a note → editor loads in main area
- "New session" button creates a session and navigates to it

---

## Success Criteria

| Signal | Pass condition |
|---|---|
| SDK connection | Health check returns `{ healthy: true }` in the UI |
| Session streaming | Agent response appears within 2s of sending a prompt |
| File read/write | Memory file edits persist after browser refresh |
| Layout | Sidebar + main area, fully navigable without friction |

---

## What This Spike Deliberately Skips

- Authentication
- Error handling beyond console.error
- Design polish
- Production build / Tauri packaging
- Tests
- Agent skill customization (use whatever OpenCode is already configured with)
- Absolute path hardening for other users' machines

---

## After the Spike

If all signals pass, the next step is v0.1 planning:

1. Write the one-sentence value proposition (still an open question)
2. Define the v0.1 scope (editor polish, agent context sidebar, basic keyboard shortcuts)
3. Create the public GitHub repository and README
4. Find one external user to test with
