import Link from "next/link"

export default async function NotesPage() {
  const res = await fetch("http://localhost:3000/api/notes", { cache: "no-store" })
  const files: string[] = await res.json()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Memory Notes</h1>
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
