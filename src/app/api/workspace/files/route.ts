import { readdirSync, statSync } from "fs"
import { join, relative } from "path"
import { WORKSPACE_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

const IGNORED_DIRS = new Set([".git", "node_modules", ".opencode", ".github"])

function walkMarkdown(dir: string): string[] {
  const results: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue
    const fullPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      results.push(...walkMarkdown(fullPath))
    } else if (entry.endsWith(".md")) {
      results.push(relative(WORKSPACE_DIR, fullPath))
    }
  }
  return results
}

export async function GET() {
  const files = walkMarkdown(WORKSPACE_DIR)
  return NextResponse.json(files)
}
