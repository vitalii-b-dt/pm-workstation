# PM Workstation — Agent Instructions

You are a coding agent working on **PM Workstation**: a purpose-built environment for AI-enabled Product Managers. PM Workstation is a **fork of `sst/opencode`** with PM-native UI features added directly to the SolidJS codebase.

Read `CONTEXT.md` before starting any coding task. Read `SPIKE.md` to understand the current build phase and what has been completed.

---

## What This Project Is

A fork of `sst/opencode` that adds PM-specific UI features on top of OpenCode's existing interface:

1. **Memory Editor panel** — edit `memories/*.md` files from within the OpenCode UI
2. **Canvas file preview** — view any workspace `.md` file rendered as markdown (not raw diff)
3. **Reassess Memory button** — one-click canned prompt to review session and suggest memory updates

This is **not** a separate app. It is OpenCode itself, with PM features added natively.

---

## Repository Layout

There are **three separate local directories** — never confuse them:

| Directory | What it is |
|---|---|
| `~/Projects/pm-workstation` | This repo. Context docs (`CONTEXT.md`, `AGENTS.md`, etc.) + the retired Next.js spike app. Not the active codebase. |
| `~/Projects/opencode-fork` | The forked OpenCode source. This is where all active development happens. |
| `~/Projects/pm-workspace` | The PM agent context directory. Contains `memories/`, `AGENTS.md`, skills. The OpenCode server runs here. |

**All coding tasks happen in `~/Projects/opencode-fork`.**

---

## Tech Stack (OpenCode fork)

| Layer | Choice | Notes |
|---|---|---|
| UI framework | SolidJS | Not React — use SolidJS primitives (`createSignal`, `createEffect`, `For`, etc.) |
| Styling | Tailwind CSS v4 | Utility-first, same conventions as the rest of the app |
| Build | Vite | `packages/app` |
| Language | TypeScript | Strict mode |
| Runtime | Bun | Package manager and script runner |

---

## Key Directories Inside the Fork

```
opencode-fork/
├── packages/
│   ├── app/                          ← SolidJS web UI (where PM features go)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── layout.tsx        ← root layout
│   │   │   │   ├── layout/
│   │   │   │   │   └── sidebar-items.tsx  ← sidebar nav items (add Memory Notes here)
│   │   │   │   └── session/
│   │   │   │       └── session-side-panel.tsx  ← side panel tabs (add Memory tab here)
│   │   │   └── components/           ← shared UI components
│   │   └── package.json
│   ├── opencode/                     ← server-side logic (Go/Bun)
│   └── sdk/                          ← @opencode-ai/sdk (do not modify)
```

---

## PM Feature Insertion Points

These are the exact files to modify for each PM feature. Keep changes **minimal and confined** to reduce rebase conflicts.

| Feature | File | What to add |
|---|---|---|
| Memory Notes in sidebar | `packages/app/src/pages/layout/sidebar-items.tsx` | New sidebar section listing `memories/*.md` files |
| Memory Editor tab | `packages/app/src/pages/session/session-side-panel.tsx` | New "Memory" tab with markdown editor |
| Canvas file preview | `packages/app/src/pages/session/session-side-panel.tsx` | Rendered markdown view for any workspace file |
| Reassess Memory button | `packages/app/src/pages/layout/sidebar-items.tsx` | Button that fires a canned prompt |

---

## Dev Workflow

```bash
# Run the dev server (hot-reload UI against a running OpenCode server)
cd ~/Projects/opencode-fork
bun run dev --filter @opencode-ai/app

# The OpenCode server must be running separately:
opencode serve --port 4096
# Run in: ~/Projects/pm-workspace
```

---

## Rebase Strategy

When upstream `sst/opencode` has diverged significantly:

```bash
cd ~/Projects/opencode-fork
git fetch upstream
git rebase upstream/main
# Resolve conflicts — PM changes are confined to the insertion point files above
bun run build --filter @opencode-ai/app   # verify build passes
```

Rebase cadence: every ~2 weeks, or on-demand when a critical upstream fix is needed.

---

## PM Workspace Constants

The OpenCode server always runs against the PM workspace:

```
PM workspace:  /Users/vitalii.batyr/Projects/pm-workspace
memories dir:  /Users/vitalii.batyr/Projects/pm-workspace/memories
```

Any code that reads `memories/*.md` files uses these absolute paths.

---

## Conventions

- **SolidJS, not React** — use `createSignal`/`createEffect`/`For`/`Show`, not `useState`/`useEffect`/`.map`
- **No new dependencies without reason** — the fork already has a markdown renderer; use it
- **Mark PM additions with comments** — `// PM WORKSTATION:` prefix on added blocks makes rebasing easier
- **No auth** in v1 — localhost trust
- **No tests** in v1 — validate by running

---

## Key References

- Architecture decisions and rationale → `CONTEXT.md`
- Build phases and session history → `SPIKE.md`
- OpenCode upstream → `https://github.com/sst/opencode`
- Fork → `https://github.com/vitalii-b-dt/opencode`
