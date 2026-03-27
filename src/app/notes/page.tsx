"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const REASSESS_PROMPT = `Review our conversation so far and my current memory files. 
Identify any important context, decisions, or learnings that should be added or updated in my memory files (active-projects.md, decisions.md, concepts.md, learning.md, or product-ideas.md). 
For each suggested change, state which file it belongs in and exactly what text should be added or updated. Be concise and specific.`

export default function NotesPage() {
  const router = useRouter()
  const [files, setFiles] = useState<string[]>([])
  const [reassessing, setReassessing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then(setFiles)
      .catch(console.error)
  }, [])

  const reassessMemory = async () => {
    setReassessing(true)
    setStatus("Finding latest session…")

    try {
      // Get the most recent session
      const sessionsRes = await fetch("/api/sessions")
      const sessions: { id: string; title?: string }[] = await sessionsRes.json()

      if (sessions.length === 0) {
        setStatus("No sessions found. Start a session first.")
        setReassessing(false)
        return
      }

      const latestSession = sessions[0]
      setStatus(`Sending to session: ${latestSession.title ?? latestSession.id.slice(0, 12)}…`)

      await fetch(`/api/sessions/${latestSession.id}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: REASSESS_PROMPT }),
      })

      // Navigate to the session to see the response stream
      router.push(`/sessions/${latestSession.id}`)
    } catch (err) {
      console.error(err)
      setStatus("Failed to send prompt.")
      setReassessing(false)
    }
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Memory Notes</h1>
        <button
          onClick={reassessMemory}
          disabled={reassessing}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {reassessing ? "Sending…" : "Reassess Memory"}
        </button>
      </div>

      {status && (
        <p className="text-xs text-gray-400 mb-4">{status}</p>
      )}

      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f}>
            <Link
              href={`/notes/${f}`}
              className="block p-3 rounded bg-gray-800 hover:bg-gray-700 text-sm"
            >
              {f.replace(".md", "")}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
