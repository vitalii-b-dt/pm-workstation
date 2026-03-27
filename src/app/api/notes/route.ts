import { readdirSync } from "fs"
import { MEMORIES_DIR } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET() {
  const files = readdirSync(MEMORIES_DIR).filter((f) => f.endsWith(".md"))
  return NextResponse.json(files)
}
