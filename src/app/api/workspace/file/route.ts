import { readFileSync } from "fs"
import { join, resolve } from "path"
import { WORKSPACE_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const relativePath = searchParams.get("path")

  if (!relativePath) {
    return NextResponse.json({ error: "path required" }, { status: 400 })
  }

  // Security: ensure the resolved path stays within WORKSPACE_DIR
  const fullPath = resolve(join(WORKSPACE_DIR, relativePath))
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    return NextResponse.json({ error: "invalid path" }, { status: 403 })
  }

  try {
    const content = readFileSync(fullPath, "utf-8")
    return NextResponse.json({ content, path: relativePath })
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 })
  }
}
