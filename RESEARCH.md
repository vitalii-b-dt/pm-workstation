# PM Workstation — OpenCode SDK Reference

This document captures everything you need to know about the OpenCode SDK and server API to build the PM Workstation web client. Sourced from the OpenCode GitHub repository (`https://github.com/sst/opencode`) at version 1.3.2 (March 2026).

---

## Package Installation

```bash
npm install @opencode-ai/sdk
```

Current version: `1.3.2`. **Pin to this version until the spike is complete.** The API surface may change in minor versions without a stability contract.

---

## Server Startup

The OpenCode server must be started explicitly. It does not auto-start:

```bash
# Always use a fixed port to avoid port-file discovery complexity
opencode serve --port 4096

# Expected stdout:
# opencode server listening on http://127.0.0.1:4096
```

Default behavior without `--port`: tries 4096 first, falls back to an OS-assigned random port. Always pass `--port 4096` to avoid discovery complexity.

The server runs a Hono HTTP server on Bun, exposing REST + SSE endpoints.

---

## Client Instantiation

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/Users/vitalii.batyr/Projects/pm-workspace",  // working directory for all requests
})
```

The `directory` parameter is injected as an `x-opencode-directory` header on every request. It tells the OpenCode server which project's context to use. For PM Workstation, this is always `pm-workspace` (where `memories/`, skills, and `AGENTS.md` live) — not the `pm-workstation` source directory.

There is also a v2 convenience wrapper for Node.js environments (spawns the server as a subprocess):
```typescript
import { createOpencode } from "@opencode-ai/sdk/v2"
// Only use in Node.js scripts, not in browser or Next.js server components
const { client, server } = await createOpencode({ hostname: "127.0.0.1", port: 4096 })
```

**Use `createOpencodeClient` (not `createOpencode`) everywhere in Next.js** — the subprocess spawner is not needed since the server is managed separately.

---

## Authentication

**Default: no authentication.** The server runs unauthenticated unless `OPENCODE_SERVER_PASSWORD` is set.

For v1 PM Workstation: keep the server unauthenticated. Localhost trust is sufficient for a personal tool.

If auth is ever needed:
```typescript
const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "...",
  headers: {
    Authorization: `Basic ${btoa("opencode:yourpassword")}`,
  },
})
```

**Important**: If `OPENCODE_SERVER_PASSWORD` is set, the SSE `EventSource` in the browser **cannot** send an `Authorization` header (browsers block custom headers on `EventSource`). This would break streaming. Do not set a server password in v1.

---

## CORS Policy

The OpenCode server allows the following origins:

| Origin | Allowed? |
|---|---|
| `http://localhost:*` (any port) | Yes |
| `http://127.0.0.1:*` (any port) | Yes |
| `tauri://localhost` | Yes |
| `https://*.opencode.ai` | Yes |
| Any other origin | No |

**`http://localhost:3000` (Next.js dev) works with zero configuration.**

If a production domain is ever needed:
```bash
opencode serve --port 4096 --cors https://your-domain.com
```

---

## Sessions API

```typescript
// Create a session
const session = await client.session.create()
// Returns: { id: string, title?: string, time: { created: number, updated: number }, ... }

// List sessions
const sessions = await client.session.list({})
// Optional filters: { roots: true, search: "keyword" }
// Returns: Session.Info[]

// Get a specific session
const session = await client.session.get({ path: { sessionID: "ses_..." } })

// Delete a session
await client.session.delete({ path: { sessionID: "ses_..." } })

// Get all messages in a session
const messages = await client.session.messages({ path: { sessionID: "ses_..." } })
```

---

## Sending Prompts

Two modes: blocking and async.

### Blocking (waits for full response)
```typescript
const result = await client.session.prompt({
  path: { sessionID: "ses_..." },
  body: {
    parts: [{ type: "text", text: "Your prompt here" }],
    // Optional: providerID: "anthropic", modelID: "claude-opus-4-5"
  }
})
// Returns: { info: MessageV2.Assistant, parts: MessageV2.Part[] }
// Use result.parts to render the response
```

### Async (fire-and-forget, stream via SSE)
```typescript
await client.session.prompt_async({
  path: { sessionID: "ses_..." },
  body: {
    parts: [{ type: "text", text: "Your prompt here" }],
  }
})
// Returns 204 immediately
// Response streams via SSE events (see SSE section below)
```

**Use `prompt_async` + SSE for the chat UI** — this gives real-time streaming. Use `prompt` only as a fallback if `prompt_async` is not available in the installed version.

### Abort a running session
```typescript
await client.session.abort({ path: { sessionID: "ses_..." } })
```

---

## SSE — Streaming Events

The SDK does not wrap SSE. Use the browser-native `EventSource` API directly in React client components.

### Endpoint
```
GET http://127.0.0.1:4096/event?directory=%2Fpath%2Fto%2Fproject
```

The `directory` query parameter must be URL-encoded. Use `encodeURIComponent(WORKSPACE_DIR)`.

### React pattern
```typescript
"use client"
import { useEffect } from "react"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

useEffect(() => {
  const url = `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
  const es = new EventSource(url)

  es.onmessage = (e) => {
    const event = JSON.parse(e.data)
    console.log(event.type, event.properties)
  }

  es.onerror = () => {
    console.error("SSE connection lost")
  }

  return () => es.close()  // clean up on unmount
}, [])
```

### Key event types

| Event type | When it fires | Useful for |
|---|---|---|
| `server.connected` | On SSE connection open | Showing "connected" status |
| `server.heartbeat` | Every 10 seconds | Keep-alive, ignore |
| `message.part.created` | Each text chunk from agent | Streaming response to UI |
| `session.updated` | Session metadata changes | Detecting when agent finishes |

**To identify all event types in your environment**, temporarily log everything:
```typescript
es.onmessage = (e) => console.log(JSON.parse(e.data))
```

### Global SSE (no directory scoping)
```
GET http://127.0.0.1:4096/global/event
```
Returns events across all projects. Payload is `{ directory: string, payload: { type, properties } }`. Less useful for PM Workstation — prefer the directory-scoped endpoint.

---

## File API

```typescript
// Read a file (absolute path required)
const file = await client.file.read({ query: { path: "/abs/path/to/file.md" } })
// Returns: { content: string, ... }

// List directory contents
const nodes = await client.file.list({ query: { path: "/abs/path/to/dir" } })
// Returns: File.Node[]

// Git status of working directory
const status = await client.file.status()
```

**File write**: The SDK's `client.file` API is read-focused. For writes, use Node.js `fs` module in Next.js API routes:

```typescript
// src/app/api/notes/[filename]/route.ts
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { MEMORIES_DIR } from "@/lib/constants"

export async function GET(_req: Request, { params }: { params: { filename: string } }) {
  const content = readFileSync(join(MEMORIES_DIR, params.filename), "utf-8")
  return Response.json({ content })
}

export async function POST(req: Request, { params }: { params: { filename: string } }) {
  const { content } = await req.json()
  writeFileSync(join(MEMORIES_DIR, params.filename), content, "utf-8")
  return Response.json({ ok: true })
}
```

---

## Search API

```typescript
// Search files by name pattern
const files = await client.find.files({ query: { query: "*.md", limit: 20 } })

// Search file contents (uses ripgrep)
const matches = await client.find.text({ query: { pattern: "product ideas" } })
```

---

## Health Check

```typescript
const health = await client.global.health()
// Returns: { healthy: boolean, version: string }
```

Use this on the home page and in the sidebar connection indicator. Call it from a server component for the initial render, and from a client component for live status updates.

---

## HTTP Endpoints (raw, without SDK)

If the SDK client isn't available in a particular context, these are the equivalent raw HTTP calls:

```
GET  /v1/global/health
GET  /v1/session/list
POST /v1/session/create
GET  /v1/session/{id}
DEL  /v1/session/{id}
GET  /v1/session/{id}/messages
POST /v1/session/{id}/prompt          (blocking)
POST /v1/session/{id}/prompt/async    (fire-and-forget)
POST /v1/session/{id}/abort
GET  /v1/file/read?path=...
GET  /v1/file/list?path=...
GET  /v1/find/files?query=...
GET  /v1/find/text?pattern=...
GET  /event?directory=...             (SSE)
GET  /global/event                    (SSE, global)
```

All endpoints accept and return JSON. The `x-opencode-directory` header is required on session and file endpoints when not set at the client level.

---

## Known Constraints and Gotchas

1. **No semver stability contract on the SDK**. Changes between minor versions are possible. Pin the version in `package.json` and test before upgrading.

2. **SSE + Auth incompatibility**. If `OPENCODE_SERVER_PASSWORD` is set, browser `EventSource` cannot authenticate (no custom header support). Do not use server auth in v1.

3. **`prompt_async` availability**. If using an older SDK version, `prompt_async` may not exist. Fallback: use `prompt` (blocking) and render `result.parts` directly.

4. **Absolute paths required**. All file API calls require absolute paths. Never pass relative paths to `client.file.read()` or `fs` calls.

5. **Server must be started manually**. There is no auto-start mechanism for a web client. The user must run `opencode serve --port 4096` in a terminal before opening the app.

6. **`directory` parameter scope**. The `directory` in the SDK client scopes all agent context to that project. For PM Workstation, this is always `pm-workspace` — the project with the agent's memory and skills. The `pm-workstation` source directory should never be passed as the `directory`.

7. **MDEditor SSE false** . `@uiw/react-md-editor` uses browser APIs and must be loaded with `dynamic(() => import(...), { ssr: false })` in Next.js.

---

## Version History

| SDK Version | Notes |
|---|---|
| 1.3.2 | Current version as of 2026-03-25. This document was written against this version. |
