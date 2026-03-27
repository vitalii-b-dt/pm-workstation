import { client } from "@/lib/opencode"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { text } = await req.json()

  await client.session.promptAsync({
    sessionID: id,
    parts: [{ type: "text", text }],
  })

  return NextResponse.json({ ok: true })
}
