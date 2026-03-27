import { client } from "@/lib/opencode"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await client.session.list({})
  return NextResponse.json(res.data ?? [])
}

export async function POST() {
  const res = await client.session.create({})
  return NextResponse.json(res.data)
}
