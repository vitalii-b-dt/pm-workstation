"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SERVER_URL, WORKSPACE_DIR } from "@/lib/constants"

interface Session {
  id: string
  title?: string
}

export default function Sidebar() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [connected, setConnected] = useState(false)

  // Fetch sessions and notes
  const refresh = () => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {})
    fetch("/api/notes")
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => {})
  }

  useEffect(() => {
    refresh()
  }, [])

  // SSE — live connection status + refresh sessions on updates
  useEffect(() => {
    const url = `${SERVER_URL}/event?directory=${encodeURIComponent(WORKSPACE_DIR)}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === "server.connected") {
        setConnected(true)
      }
      if (event.type === "session.updated") {
        // Refresh session list when a session changes title/metadata
        fetch("/api/sessions")
          .then((r) => r.json())
          .then(setSessions)
          .catch(() => {})
      }
    }

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [])

  const newSession = async () => {
    const res = await fetch("/api/sessions", { method: "POST" })
    const s = await res.json()
    refresh()
    router.push(`/sessions/${s.id}`)
  }

  return (
    <div className="flex flex-col h-full gap-6 overflow-hidden">
      {/* App title + connection status */}
      <div>
        <Link href="/" className="text-sm font-semibold text-gray-100 block mb-1">
          PM Workstation
        </Link>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {connected ? "connected" : "disconnected"}
          </span>
        </div>
      </div>

      {/* Sessions */}
      <section className="flex flex-col gap-2 min-h-0">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Sessions
          </span>
          <button
            onClick={newSession}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            + New
          </button>
        </div>
        <ul className="space-y-0.5 overflow-y-auto flex-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="text-sm truncate block px-2 py-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
              >
                {s.title ?? s.id.slice(0, 12) + "…"}
              </Link>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="text-xs text-gray-600 px-2 py-1">No sessions yet</li>
          )}
        </ul>
      </section>

      {/* Notes */}
      <section className="flex flex-col gap-2 min-h-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Memory Notes
        </span>
        <ul className="space-y-0.5 overflow-y-auto flex-1">
          {notes.map((f) => (
            <li key={f}>
              <Link
                href={`/notes/${f}`}
                className="text-sm truncate block px-2 py-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
              >
                {f.replace(".md", "")}
              </Link>
            </li>
          ))}
          {notes.length === 0 && (
            <li className="text-xs text-gray-600 px-2 py-1">No notes found</li>
          )}
        </ul>
      </section>
    </div>
  )
}
