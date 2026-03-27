import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { MEMORIES_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const content = readFileSync(join(MEMORIES_DIR, filename), "utf-8")
  return NextResponse.json({ content })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const { content } = await req.json()
  writeFileSync(join(MEMORIES_DIR, filename), content, "utf-8")
  return NextResponse.json({ ok: true })
}
