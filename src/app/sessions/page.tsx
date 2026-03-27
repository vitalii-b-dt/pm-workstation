import { client } from "@/lib/opencode"
import Link from "next/link"

export default async function SessionsPage() {
  let sessions: { id: string; title?: string }[] = []
  let error: string | null = null

  try {
    const res = await client.session.list({})
    sessions = (res.data ?? []) as { id: string; title?: string }[]
  } catch (e) {
    error = String(e)
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {sessions.length === 0 && !error && (
        <p className="text-gray-400">No sessions yet.</p>
      )}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link
              href={`/sessions/${s.id}`}
              className="block p-3 rounded bg-gray-800 hover:bg-gray-700 text-sm"
            >
              {s.title ?? s.id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
