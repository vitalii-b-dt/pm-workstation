"use client"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

export default function NotePage({
  params,
}: {
  params: Promise<{ filename: string }>
}) {
  const [filename, setFilename] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => setFilename(p.filename))
  }, [params])

  useEffect(() => {
    if (!filename) return
    setLoading(true)
    fetch(`/api/notes/${filename}`)
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filename])

  const save = async () => {
    if (!filename) return
    await fetch(`/api/notes/${filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading…</div>
  }

  return (
    <div className="flex flex-col h-screen" data-color-mode="dark">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <h2 className="text-sm font-medium text-gray-300">
          {filename?.replace(".md", "") ?? ""}
        </h2>
        <button
          onClick={save}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? "")}
          height="100%"
          preview="live"
        />
      </div>
    </div>
  )
}
