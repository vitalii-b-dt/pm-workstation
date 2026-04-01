# PM Workstation — Build History & Phase Plan

## Phase 0: Next.js Spike (COMPLETED — 2026-03-27)

Built a Next.js sidecar app to validate core assumptions:

### What was proven
- [x] OpenCode server connection (REST + SSE) works from a browser client
- [x] Streaming agent responses work via native `EventSource`
- [x] `memories/*.md` files can be read and written from a web app
- [x] A basic PM layout (sidebar + chat + editor) is navigable

### Key API discoveries (correcting RESEARCH.md)
- API paths have **no `/v1/` prefix**: `/global/health`, `/session`, `/session/{id}/prompt_async`
- SSE event for streaming: `message.part.delta` (not `message.part.created`)
- SSE done signal: `session.idle` (not `session.updated`)
- SDK method is camelCase: `promptAsync` (not `prompt_async`)

### What was built
- `src/app/` — full Next.js app: chat, notes editor, canvas file viewer, sidebar
- `src/app/notes/` — memory file list + editor with Cmd+S
- `src/app/sessions/[id]/` — streaming chat view
- `src/app/canvas/` — workspace file preview (rendered markdown)
- `src/app/api/` — API routes for sessions, notes, workspace
- `src/components/Sidebar.tsx` — sidebar with sessions, notes, SSE status
- Public GitHub repo created: `https://github.com/vitalii-b-dt/pm-workstation`

### Why this approach was retired
The Next.js sidecar duplicated features OpenCode already does better (chat, streaming, file tree). Adding PM features on top of a full rebuild wastes sessions and produces an inferior UX. The sidecar always feels like a second-class citizen.

---

## Phase 1: Fork OpenCode (CURRENT)

**Decision made: 2026-03-30**

Fork `sst/opencode` and add PM features natively to the SolidJS UI. Get 95% of OpenCode's polished UI for free; only build the PM-specific additions.

### Setup (COMPLETED — 2026-03-30)

- [x] Fork `sst/opencode` on GitHub → `github.com/vitalii-b-dt/opencode` (forked at v1.3.7)
- [x] Clone to `~/Projects/opencode-fork`
- [x] Add upstream remote: `git remote add upstream https://github.com/sst/opencode`
- [x] Confirm build works: `bun install --ignore-scripts && bun run build` in `packages/app` — passes cleanly in 9.6s
- [ ] Confirm dev server works end-to-end: `bun run dev` in `packages/app` + server from source in Terminal 1 (do this at the start of the next session)

### PM Features to Add (in order)

1. **Memory Editor panel** — highest priority; the core PM workflow
   - File: `packages/app/src/pages/session/session-side-panel.tsx`
   - Add a "Memory" tab to the side panel
   - Tab body: list of `memories/*.md` files, click to open in a markdown editor
   - Save on Cmd+S

2. **Reassess Memory button**
   - File: `packages/app/src/pages/layout/sidebar-items.tsx`
   - A button that fires a canned prompt: `"Please review our session and suggest updates to my memory files."`

3. **Canvas file preview** (rendered markdown, not raw diff)
   - File: `packages/app/src/pages/session/session-side-panel.tsx`
   - When a workspace `.md` file is referenced, offer a "Preview" view that renders markdown instead of the default diff/raw view

### Conventions for all PM additions
- Prefix every added block with `// PM WORKSTATION:` comment
- Keep changes confined to the insertion point files listed above
- Use existing SolidJS/Tailwind patterns in the codebase — no new dependencies

---

## Rebase Log

| Date | Upstream version | Notes |
|---|---|---|
| 2026-03-30 | v1.3.7 (commit 14f9e21) | Initial fork — build passes |

Update this table after every rebase.

---

## Phase 2: External Validation (FUTURE)

- Find one other AI-enabled PM to test with
- Gather feedback on memory editor UX
- Decide whether Tauri/Electron packaging is needed or running from source is acceptable for this user

---

## Packaging Reference (when ready)

Two options exist in the fork:

**Option A — Replace the global CLI binary (for personal use / one tester):**
```bash
cd ~/Projects/opencode-fork/packages/opencode
~/.bun/bin/bun run script/build.ts
# Output: dist/opencode-darwin-arm64/bin/opencode
# Copy that binary to the other machine; it is self-contained
```

**Option B — Full desktop installer (Electron, preferred over Tauri):**
```bash
cd ~/Projects/opencode-fork/packages/desktop-electron
# Electron build — no Rust required
npx electron-builder
# Produces: .dmg (macOS), NSIS installer (Windows), .AppImage/.deb (Linux)
```

Tauri (`packages/desktop/`) produces smaller binaries but requires Rust + Cargo. Use Electron first.

---

## Phase 3: Connectors (FUTURE, v2+)

- Jira MCP integration (read issues, write comments)
- Confluence MCP integration (read pages, write drafts)
- GitHub MCP integration (read PRs, issues)
- These are agent-side (MCP servers), no UI fork changes needed
